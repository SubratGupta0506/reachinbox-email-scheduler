import type {
  NextFunction,
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

export interface AuthenticatedRequest
  extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message:
          "Authentication required",
      });
    }

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        message:
          "Invalid authorization header",
      });
    }

    const secret =
      process.env.JWT_SECRET;

    if (!secret) {
      console.error(
        "JWT_SECRET is not configured"
      );

      return res.status(500).json({
        message:
          "Authentication configuration error",
      });
    }

    const decoded =
      jwt.verify(
        token,
        secret
      ) as {
        userId?: string;
        email?: string;
        name?: string;
        avatarUrl?: string | null;
      };

    if (!decoded.userId) {
      return res.status(401).json({
        message:
          "Invalid authentication token",
      });
    }

    req.user = {
      userId: decoded.userId,
      email:
        decoded.email || "",
      name:
        decoded.name || "",
      avatarUrl:
        decoded.avatarUrl || null,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication failed:",
      error
    );

    return res.status(401).json({
      message:
        "Invalid or expired authentication token",
    });
  }
};