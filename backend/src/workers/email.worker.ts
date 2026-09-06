import "dotenv/config";

import { Worker } from "bullmq";
import IORedis from "ioredis";

import { sendEmail } from "../services/email.service.js";
import { canSendEmail } from "../services/rate-limit.service.js";
import { waitForMinimumDelay } from "../services/delay.service.js";
import { RateLimitError } from "../errors/rate-limit.error.js";
import { emailQueue } from "../queues/email.queue.js";
import { indexEmail } from "../services/elasticsearch.service.js";

import {
  getEmailById,
  markEmailAsSent,
  markEmailAsFailed,
} from "../repositories/email.repository.js";

import {
  sendSlackRateLimitNotification,
} from "../services/slack.service.js";

const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

const WORKER_CONCURRENCY = Number(
  process.env.WORKER_CONCURRENCY || 5
);

const SMTP_RETRY_DELAY_SECONDS = 60;

const isSmtpRateLimitError = (
  error: unknown
): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const smtpError = error as {
    responseCode?: number;
    response?: string;
    code?: string;
  };

  return (
    smtpError.responseCode === 429 ||
    smtpError.response === "429 Rate limited"
  );
};

const rescheduleEmailJob = async (
  job: any,
  delaySeconds: number,
  reason: string
) => {
  const retryDelay = delaySeconds * 1000;

  const retryJob = await emailQueue.add(
    "email-retry",
    {
      ...job.data,
      retryReason: reason,
    },
    {
      delay: retryDelay,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log(
    `Email ${job.data.emailId} rescheduled.`
  );

  console.log(
    `New job ID: ${retryJob.id}`
  );

  console.log(
    `Retrying in approximately ${delaySeconds} seconds.`
  );

  return retryJob;
};

const worker = new Worker(
  "email-queue",

  async (job) => {
    console.log(
      `Processing email job ${job.id}`
    );

    try {
      const existingEmail =
        await getEmailById(job.data.emailId);

      if (!existingEmail) {
        throw new Error(
          `Email record ${job.data.emailId} not found in PostgreSQL`
        );
      }

      console.log(
        `Current email status: ${existingEmail.status}`
      );

      if (existingEmail.status === "sent") {
        console.log(
          `Email ${job.data.emailId} is already sent. Skipping duplicate send.`
        );

        return {
          success: true,
          alreadySent: true,
          messageId: existingEmail.message_id,
        };
      }

      const rateLimitResult =
        await canSendEmail(
          job.data.userId,
          job.data.hourlyLimit
        );

      if (!rateLimitResult.allowed) {
        console.log(
          `Hourly rate limit reached for user ${job.data.userId}`
        );

        await sendSlackRateLimitNotification(
          job.data.userId,
          rateLimitResult.retryAfterSeconds
        );

        throw new RateLimitError(
          rateLimitResult.retryAfterSeconds
        );
      }

      await waitForMinimumDelay(
        job.data.userId,
        job.data.minimumDelaySeconds ?? 0
      );

      console.log(
        `Minimum delay satisfied for job ${job.id}. Sending email...`
      );

      const result = await sendEmail({
        recipient: job.data.recipient,
        subject: job.data.subject,
        body: job.data.body,
      });

      await markEmailAsSent(
        job.data.emailId,
        result.messageId
      );

      await indexEmail({
        id: existingEmail.id,

        userId: existingEmail.user_id,

        sender: existingEmail.sender,

        recipient: existingEmail.recipient,

        subject: existingEmail.subject,

        body: existingEmail.body,

        status: "sent",

        scheduledAt: new Date(
          existingEmail.scheduled_at
        ).toISOString(),

        sentAt: new Date().toISOString(),

        createdAt: new Date(
          existingEmail.created_at
        ).toISOString(),
      });

      console.log(
        "Email sent successfully"
      );

      console.log(
        `Message ID: ${result.messageId}`
      );

      if (result.previewUrl) {
        console.log(
          `Preview URL: ${result.previewUrl}`
        );
      }

      return result;
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.log(
          `Rate limit hit for job ${job.id}. Rescheduling email...`
        );

        const retryDelay =
          error.retryAfterSeconds + 1;

        const retryJob =
          await rescheduleEmailJob(
            job,
            retryDelay,
            "hourly-rate-limit"
          );

        return {
          success: true,
          rescheduled: true,
          reason: "hourly-rate-limit",
          retryJobId: retryJob.id,
        };
      }

      if (isSmtpRateLimitError(error)) {
        console.log(
          `SMTP provider rate limit reached for job ${job.id}.`
        );

        console.log(
          `Email ${job.data.emailId} will be safely rescheduled instead of being marked failed.`
        );

        const retryJob =
          await rescheduleEmailJob(
            job,
            SMTP_RETRY_DELAY_SECONDS,
            "smtp-rate-limit"
          );

        return {
          success: true,
          rescheduled: true,
          reason: "smtp-rate-limit",
          retryJobId: retryJob.id,
        };
      }

      console.error(
        "Email sending failed:",
        error
      );

      if (job.data.emailId) {
        await markEmailAsFailed(
          job.data.emailId
        );
      }

      throw error;
    }
  },

  {
    connection,
    concurrency: WORKER_CONCURRENCY,
  }
);

worker.on(
  "completed",
  (job) => {
    console.log(
      `Job ${job.id} completed`
    );
  }
);

worker.on(
  "failed",
  (job, error) => {
    console.error(
      `Job ${job?.id} failed:`,
      error.message
    );
  }
);

console.log(
  `Email worker started with concurrency=${WORKER_CONCURRENCY}`
);