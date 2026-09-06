import { Router } from "express";
import jwt from "jsonwebtoken";

import {
  getGoogleAuthUrl,
  getGoogleUser,
} from "../services/google-auth.service.js";

import {
  findOrCreateGoogleUser,
} from "../repositories/user.repository.js";

const router = Router();

router.get("/google", (_req, res) => {
  try {
    const authUrl = getGoogleAuthUrl();

    res.redirect(authUrl);
  } catch (error) {
    console.error(
      "Failed to start Google OAuth:",
      error
    );

    return res.status(500).json({
      message: "Failed to start Google login",
    });
  }
});

router.get(
  "/google/callback",
  async (req, res) => {
    try {
      const code = String(
        req.query.code || ""
      );

      if (!code) {
        return res.status(400).json({
          message:
            "Google authorization code is missing",
        });
      }

      const googleUser =
        await getGoogleUser(code);

      const user =
        await findOrCreateGoogleUser(
          googleUser
        );

      const secret =
        process.env.JWT_SECRET;

      if (!secret) {
        throw new Error(
          "JWT_SECRET is not configured"
        );
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
        },
        secret,
        {
          expiresIn: "7d",
        }
      );

      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

      return res.redirect(
        `${frontendUrl}/auth/callback?token=${encodeURIComponent(
          token
        )}`
      );
    } catch (error) {
      console.error(
        "Google OAuth callback failed:",
        error
      );

      return res.status(500).json({
        message:
          "Google authentication failed",
      });
    }
  }
);

router.get("/logout", (_req, res) => {
  return res.json({
    message: "Logout successful",
  });
});

export default router;