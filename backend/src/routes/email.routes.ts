import { Router } from "express";

import {
  getEmailById,
} from "../repositories/email.repository.js";

import {
  searchEmails,
} from "../services/elasticsearch.service.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/search",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const searchText =
        String(
          req.query.q || ""
        ).trim();

      if (!searchText) {
        return res.status(400).json({
          message:
            "Search query is required",
        });
      }

      const user =
        req.user;

      if (!user) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      const emails =
        await searchEmails(
          user.userId,
          searchText
        );

      return res.json({
        count:
          emails.length,

        emails,
      });
    } catch (error) {
      console.error(
        "Email search failed:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to search emails",
      });
    }
  }
);

router.get(
  "/:emailId",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    try {
      const emailId =
        String(
          req.params.emailId || ""
        ).trim();

      const user =
        req.user;

      if (!emailId) {
        return res.status(400).json({
          message:
            "emailId is required",
        });
      }

      if (!user) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      const email =
        await getEmailById(
          emailId
        );

      if (!email) {
        return res.status(404).json({
          message:
            "Email not found",
        });
      }

      if (
        email.user_id !==
        user.userId
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to access this email",
        });
      }

      return res.json({
        email,
      });
    } catch (error) {
      console.error(
        "Failed to fetch email:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch email",
      });
    }
  }
);

export default router;