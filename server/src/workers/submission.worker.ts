import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";

const worker = new Worker(
  "submission-queue",
  async (job) => {
    console.log("Job received");
    console.log(job.data);
  },
  {
    connection: redisConnection,
  }
);

console.log("Worker started");