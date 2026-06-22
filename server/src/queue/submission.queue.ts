import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis.js";

export const submissionQueue = new Queue("submission-queue", {
  connection: redisConnection,
});