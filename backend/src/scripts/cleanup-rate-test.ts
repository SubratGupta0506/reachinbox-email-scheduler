import "dotenv/config";

import IORedis from "ioredis";
import { Queue } from "bullmq";

import { pool } from "../config/database.js";

const redis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue("email-queue", {
  connection: redis,
});

const USER_ID =
  "b522e170-9c8f-4362-8da8-066485e9b52e";

const RETRY_JOB_IDS = [
  "2191",
  "2192",
  "2193",
];

const cleanup = async () => {
  console.log("Starting rate-limit test cleanup...");

  // Remove retry jobs
  for (const jobId of RETRY_JOB_IDS) {
    const job = await queue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`Removed BullMQ job ${jobId}`);
    } else {
      console.log(`BullMQ job ${jobId} not found`);
    }
  }

  // Remove test email records
  const result = await pool.query(
    `
      DELETE FROM emails
      WHERE user_id = $1
      AND subject = $2
      RETURNING id, recipient, status
    `,
    [
      USER_ID,
      "ReachInbox Rate Limit Test",
    ]
  );

  console.log(
    `Removed ${result.rowCount ?? 0} rate-limit test email records`
  );

  // Clear rate-limit counter
  await redis.del(
    `email-rate:${USER_ID}`
  );

  // Clear Slack notification cooldown
  await redis.del(
    `slack-rate-limit-notified:${USER_ID}`
  );

  console.log("Redis rate-limit keys cleared.");

  await queue.close();
  await redis.quit();
  await pool.end();

  console.log("Cleanup completed successfully.");
};

cleanup().catch(async (error) => {
  console.error("Cleanup failed:", error);

  await queue.close().catch(() => {});
  await redis.quit().catch(() => {});
  await pool.end().catch(() => {});

  process.exit(1);
});