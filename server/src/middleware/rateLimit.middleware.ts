import type { NextFunction, Request, Response } from "express";

import { rateLimiterService } from "../services/rateLimiter.service.js";

type RequestWithUser = Request & {
  user?: {
    id?: string;
    userId?: string;
  };
};

function getRequestUserId(req: RequestWithUser): string {
  return (
    req.user?.id ??
    req.user?.userId ??
    req.ip ??
    req.socket.remoteAddress ??
    "anonymous"
  );
}

export async function rateLimitMiddleware(
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = getRequestUserId(req);
    const allowed = await rateLimiterService.allowRequest(userId);

    if (!allowed) {
      return res.status(429).json({ error: "Too many requests" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
