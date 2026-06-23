import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const failedQueue =
  new Queue("failed-submissions", {
    connection: redisConnection,
  });