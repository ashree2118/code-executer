import { Redis } from "ioredis";

export const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
};

export const redisClient = new Redis(redisConnection);

export class RedisService {
  getClient() {
    return redisClient;
  }
}

export const redisService = new RedisService();
