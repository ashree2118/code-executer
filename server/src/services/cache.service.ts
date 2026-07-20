import { createHash } from "node:crypto";

import { redisService } from "../lib/redis.js";

export type CachedExecutionResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: number;
};

export class CacheService {
  generateKey(language: string, code: string, stdin = ""): string {
    const hash = createHash("sha256")
      .update(language + code + stdin)
      .digest("hex");

    return `result:${hash}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const cachedValue = await redisService.getClient().get(key);

    if (!cachedValue) {
      return null;
    }

    return JSON.parse(cachedValue) as T;
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    await redisService.getClient().set(key, JSON.stringify(value), "EX", ttl);
  }
}

export const cacheService = new CacheService();
