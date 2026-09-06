import "./workers/email.worker.js";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  testDatabaseConnection,
} from "./config/database.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "./middleware/auth.middleware.js";

import { emailQueue } from "./queues/email.queue.js";

import {
  verifyEmailConnection,
} from "./services/email.service.js";

import {
  createEmailIndex,
} from "./services/elasticsearch.service.js";

import {
  serverAdapter,
} from "./services/bull-board.service.js";

import {
  getEmailsByUser,
} from "./repositories/email.repository.js";

import emailRoutes from "./routes/email.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import authRoutes from "./routes/auth.routes.js";
import slackRoutes from "./routes/slack.routes.js";

dotenv.config();

const app = express();

/*
 * Middleware
 */
app.use(cors());

app.use(express.json());

/*
 * Bull Board
 *
 * Local admin dashboard for monitoring
 * BullMQ queues and jobs.
 */
app.use(
  "/admin/queues",
  serverAdapter.getRouter()
);

/*
 * Authentication routes
 */
app.use(
  "/auth",
  authRoutes
);

/*
 * Slack OAuth routes
 */
app.use(
  "/auth/slack",
  slackRoutes
);

/*
 * Email routes
 *
 * Includes:
 * GET /emails/search
 * GET /emails/:emailId
 */
app.use(
  "/emails",
  emailRoutes
);

/*
 * Campaign scheduling
 */
app.use(
  "/campaigns",
  campaignRoutes
);

/*
 * Recipient file upload
 */
app.use(
  "/upload",
  uploadRoutes
);

/*
 * Health check
 */
app.get(
  "/health",
  (_req, res) => {
    return res.json({
      status: "ok",
      message:
        "ReachInbox backend is running",
    });
  }
);

/*
 * Get emails for a user.
 *
 * Supported statuses:
 * scheduled
 * sent
 * failed
 *
 * NOTE:
 * This currently receives userId from the
 * frontend. We will replace this with JWT
 * authentication middleware in the next
 * security step.
 */
app.get(
  "/emails",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const user =
        req.user;

      if (!user) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      const status =
        String(
          req.query.status || ""
        ).trim();

      const allowedStatuses = [
        "scheduled",
        "sent",
        "failed",
      ];

      if (
        status &&
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid email status",
        });
      }

      const emails =
        await getEmailsByUser(
          user.userId,
          status || undefined
        );

      return res.json({
        count:
          emails.length,

        emails,
      });
    } catch (error) {
      console.error(
        "Failed to fetch emails:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch emails",
      });
    }
  }
);

/*
 * Start HTTP server
 */
const PORT = Number(
  process.env.PORT || 5000
);

app.listen(
  PORT,
  async () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );

    /*
     * PostgreSQL connection check
     */
    try {
      await testDatabaseConnection();
    } catch (error) {
      console.error(
        "PostgreSQL connection failed:",
        error
      );
    }

    /*
     * Ethereal SMTP connection check
     */
    try {
      await verifyEmailConnection();
    } catch (error) {
      console.error(
        "Ethereal connection failed:",
        error
      );
    }

    /*
     * Elasticsearch connection/index check
     */
    try {
      await createEmailIndex();
    } catch (error) {
      console.error(
        "Elasticsearch connection failed:",
        error
      );
    }
  }
);