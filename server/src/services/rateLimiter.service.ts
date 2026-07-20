import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { redisService } from "../lib/redis.js";

const WINDOW_MS = 60 * 1000;
const DEFAULT_REQUEST_LIMIT = 10;

const slidingWindowScript = readFileSync(
  new URL("../lua/slidingWindow.lua", import.meta.url),
  "utf8"
);

export class RateLimiterService {
  constructor(
    private readonly limit = Number(
      process.env.RATE_LIMIT_REQUESTS ?? DEFAULT_REQUEST_LIMIT
    ),
    private readonly windowMs = WINDOW_MS
  ) {}

  async allowRequest(userId: string): Promise<boolean> {
    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const member = `${now}:${randomUUID()}`;

    const result = await redisService.getClient().eval(
      slidingWindowScript,
      1,
      key,
      now,
      this.windowMs,
      this.limit,
      member
    );

    return result === 1;
  }
}

export const rateLimiterService = new RateLimiterService();
