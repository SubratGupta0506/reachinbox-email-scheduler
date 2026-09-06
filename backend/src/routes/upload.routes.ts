import { Router } from "express";
import multer from "multer";

import { parseRecipients } from "../utils/recipient-parser.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },
});

router.post(
  "/recipients",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message:
            "CSV or TXT file is required",
        });
      }

      const allowedExtensions = [
        ".csv",
        ".txt",
      ];

      const filename =
        req.file.originalname.toLowerCase();

      const isAllowed =
        allowedExtensions.some(
          (extension) =>
            filename.endsWith(
              extension
            )
        );

      if (!isAllowed) {
        return res.status(400).json({
          message:
            "Only CSV and TXT files are supported",
        });
      }

      const content =
        req.file.buffer.toString(
          "utf-8"
        );

      const recipients =
        parseRecipients(
          content
        );

      if (
        recipients.length ===
        0
      ) {
        return res.status(400).json({
          message:
            "No valid email addresses found in file",
        });
      }

      return res.json({
        message:
          "Recipients parsed successfully",

        filename:
          req.file.originalname,

        count:
          recipients.length,

        recipients,
      });
    } catch (error) {
      console.error(
        "Failed to parse recipient file:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to process recipient file",
      });
    }
  }
);

export default router;