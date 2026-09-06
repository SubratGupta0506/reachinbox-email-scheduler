import "dotenv/config";

import { randomBytes } from "node:crypto";

import { Router } from "express";
import IORedis from "ioredis";

import {
  getSlackAuthUrl,
  exchangeSlackCode,
} from "../services/slack.service.js";

import {
  saveSlackConnection,
  deleteSlackConnection,
  getSlackConnection,
} from "../repositories/slack.repository.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const redis = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

const STATE_EXPIRY_SECONDS = 600;

/*
 * Start Slack OAuth.
 *
 * The frontend sends the JWT in the
 * Authorization header.
 *
 * We store the userId against a short-lived
 * random state in Redis.
 */
router.post(
  "/connect",
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

      const state =
        randomBytes(32).toString(
          "hex"
        );

      const stateKey =
        `slack-oauth-state:${state}`;

      await redis.set(
        stateKey,
        user.userId,
        "EX",
        STATE_EXPIRY_SECONDS
      );

      const authUrl =
        getSlackAuthUrl(state);

      return res.json({
        authUrl,
      });
    } catch (error) {
      console.error(
        "Failed to start Slack OAuth:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to start Slack connection",
      });
    }
  }
);

/*
 * Slack OAuth callback.
 *
 * This endpoint does NOT need JWT because
 * Slack redirects the browser here.
 *
 * The user identity comes from the
 * short-lived OAuth state stored in Redis.
 */
router.get(
  "/callback",
  async (req, res) => {
    try {
      const code = String(
        req.query.code || ""
      ).trim();

      const state = String(
        req.query.state || ""
      ).trim();

      if (!code) {
        return res.status(400).json({
          message:
            "Slack authorization code is missing",
        });
      }

      if (!state) {
        return res.status(400).json({
          message:
            "Slack OAuth state is missing",
        });
      }

      const stateKey =
        `slack-oauth-state:${state}`;

      const userId =
        await redis.get(stateKey);

      /*
       * Delete immediately so the state
       * cannot be reused.
       */
      await redis.del(stateKey);

      if (!userId) {
        return res.status(400).json({
          message:
            "Slack OAuth state is invalid or expired",
        });
      }

      const slack =
        await exchangeSlackCode(
          code
        );

      await saveSlackConnection({
        userId,

        accessToken:
          slack.accessToken,

        slackUserId:
          slack.slackUserId,

        teamId:
          slack.teamId,

        teamName:
          slack.teamName,
      });

      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

      return res.redirect(
        `${frontendUrl}/dashboard/scheduled?slack=connected`
      );
    } catch (error) {
      console.error(
        "Slack OAuth callback failed:",
        error
      );

      return res.status(500).json({
        message:
          "Slack connection failed",
      });
    }
  }
);

/*
 * Check Slack connection status.
 */
router.get(
  "/status",
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

      const connection =
        await getSlackConnection(
          user.userId
        );

      return res.json({
        connected:
          Boolean(connection),

        teamName:
          connection?.team_name ||
          null,
      });
    } catch (error) {
      console.error(
        "Failed to check Slack status:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to check Slack status",
      });
    }
  }
);

/*
 * Disconnect Slack.
 */
router.delete(
  "/disconnect",
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

      await deleteSlackConnection(
        user.userId
      );

      return res.json({
        message:
          "Slack disconnected successfully",
      });
    } catch (error) {
      console.error(
        "Failed to disconnect Slack:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to disconnect Slack",
      });
    }
  }
);

export default router;