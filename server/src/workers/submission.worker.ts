import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { evaluateSubmission } from "../services/execution-service.js";
import { failedQueue } from "../queue/failed.queue.js";
import {
  getSubmission,
  updateSubmissionStatus,
  markFailed,
} from "../services/submission-service.js";
import { Verdict } from "../types/execution.js";

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
      const evaluation = await evaluateSubmission({
        language: submission.language,
        code: submission.code,
        testCases: submission.test_cases ?? [],
      });

      if (evaluation.verdict !== Verdict.Accepted) {
        await markFailed(
          submissionId,
          evaluation.results.map((result) => result.stdout).join("\n"),
          evaluation.results.map((result) => result.stderr).join("\n")
        );

        return evaluation;
      }

      await updateSubmissionStatus(
        submissionId,
        "done",
        evaluation.results.map((result) => result.stdout).join("\n"),
        evaluation.results.map((result) => result.stderr).join("\n")
      );

      return evaluation;
    } catch (error: any) {
      await markFailed(submissionId, "", error.message);
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