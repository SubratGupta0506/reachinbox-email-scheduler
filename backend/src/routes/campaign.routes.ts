import { Router } from "express";

import { emailQueue } from "../queues/email.queue.js";

import {
  createEmailRecord,
  updateBullJobId,
} from "../repositories/email.repository.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      const {
        recipients,
        subject,
        body,
        startTime,
        minimumDelaySeconds,
        hourlyLimit,
      } = req.body;

      /*
       * userId and sender are intentionally
       * NOT accepted from the frontend.
       *
       * They come from the verified JWT.
       */

      const userId =
        user.userId;

      const sender =
        user.email;

      if (
        !Array.isArray(
          recipients
        ) ||
        recipients.length === 0 ||
        !subject ||
        !body ||
        !startTime
      ) {
        return res.status(400).json({
          message:
            "recipients, subject, body and startTime are required",
        });
      }

      const delaySeconds =
        Number(
          minimumDelaySeconds ??
            process.env
              .DEFAULT_MINIMUM_DELAY_SECONDS ??
            0
        );

      const limit =
        Number(
          hourlyLimit ??
            process.env
              .DEFAULT_HOURLY_LIMIT ??
            100
        );

      if (
        !Number.isFinite(
          delaySeconds
        ) ||
        delaySeconds < 0
      ) {
        return res.status(400).json({
          message:
            "minimumDelaySeconds must be a valid non-negative number",
        });
      }

      if (
        !Number.isFinite(
          limit
        ) ||
        limit <= 0
      ) {
        return res.status(400).json({
          message:
            "hourlyLimit must be greater than 0",
        });
      }

      const scheduledAt =
        new Date(startTime);

      if (
        Number.isNaN(
          scheduledAt.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid startTime",
        });
      }

      /*
       * Normalize and deduplicate
       * recipient addresses.
       */
      const uniqueRecipients = [
        ...new Set(
          recipients
            .filter(
              (
                recipient: unknown
              ): recipient is string =>
                typeof recipient ===
                "string"
            )
            .map(
              (
                recipient: string
              ) =>
                recipient
                  .trim()
                  .toLowerCase()
            )
            .filter(
              (
                recipient: string
              ) =>
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  recipient
                )
            )
        ),
      ];

      if (
        uniqueRecipients.length ===
        0
      ) {
        return res.status(400).json({
          message:
            "No valid recipients provided",
        });
      }

      const createdEmails =
        [];

      const delayMilliseconds =
        Math.max(
          0,
          scheduledAt.getTime() -
            Date.now()
        );

      for (
        const recipient of uniqueRecipients
      ) {
        /*
         * Create the PostgreSQL record
         * first.
         */
        const email =
          await createEmailRecord({
            userId,

            sender,

            recipient,

            subject:
              subject.trim(),

            body,

            scheduledAt,
          });

        /*
         * Add the email to BullMQ.
         */
        const job =
          await emailQueue.add(
            "scheduled-email",
            {
              emailId:
                email.id,

              recipient:
                email.recipient,

              subject:
                email.subject,

              body:
                email.body,

              userId:
                email.user_id,

              hourlyLimit:
                limit,

              minimumDelaySeconds:
                delaySeconds,
            },
            {
              delay:
                delayMilliseconds,

              removeOnComplete:
                true,

              removeOnFail:
                false,
            }
          );

        /*
         * Store BullMQ job ID in PostgreSQL.
         */
        await updateBullJobId(
          email.id,
          String(job.id)
        );

        createdEmails.push({
          emailId:
            email.id,

          jobId:
            String(job.id),

          recipient:
            email.recipient,
        });
      }

      return res.status(201).json({
        message:
          "Campaign scheduled successfully",

        count:
          createdEmails.length,

        scheduledAt,

        emails:
          createdEmails,
      });
    } catch (error) {
      console.error(
        "Failed to schedule campaign:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to schedule campaign",
      });
    }
  }
);

export default router;