import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { executeCode } from "../services/execution-service.js";
import { failedQueue } from "../queue/failed.queue.js";
import {
  getSubmission,
  updateSubmissionStatus,
  markFailed,
} from "../services/submission-service.js";

const worker = new Worker(
  "submission-queue",
  async (job) => {
    const { submissionId } = job.data;

    const submission = await getSubmission(submissionId);

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    await updateSubmissionStatus(submissionId, "running");

    try {
      // Execute inside Docker
      const output = await executeCode(
        submission.language as "javascript" | "python" | "java",
        submission.code
      );

      if (output.exitCode !== 0) {
        await markFailed(
          submissionId,
          output.stdout,
          output.stderr
        );

        return output;
      }

      await updateSubmissionStatus(
        submissionId,
        "done",
        output.stdout,
        output.stderr
      );

      return output;
    } catch (error: any) {
      await markFailed(
        submissionId,
        "",
        error.message
      );

      throw error;
    }
  },
  {
    connection: redisConnection,
  }
);

// Dead Letter Queue
worker.on("failed", async (job, err) => {
  console.error(
    `Job ${job?.id} completely failed execution:`,
    err.message
  );

  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    await failedQueue.add("exhausted-submission", {
      jobId: job.id,
      data: job.data,
      failedReason: err.message,
    });

    console.log(
      `Job ${job.id} routed to Dead Letter Queue.`
    );
  }
});

console.log("Worker started");