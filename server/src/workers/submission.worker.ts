import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { evaluateSubmission } from "../services/execution-service.js";
import { failedQueue } from "../queue/failed.queue.js";
import {
  getSubmission,
  updateSubmissionStatus,
  markFailed,
} from "../services/submission-service.js";
import { cacheService, type CachedExecutionResult } from "../services/cache.service.js";
import { Verdict } from "../types/execution.js";

const RESULT_CACHE_TTL_SECONDS = 3600;

type SubmissionJobData = {
  submissionId: string;
  cacheKey?: string;
  stdin?: string;
};

const worker = new Worker<SubmissionJobData>(
  "submission-queue",
  async (job) => {
    const { submissionId, cacheKey, stdin = "" } = job.data;

    const submission = await getSubmission(submissionId);

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    await updateSubmissionStatus(submissionId, "running");

    try {
      const evaluation = await evaluateSubmission({
        language: submission.language,
        code: submission.code,
        stdin,
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

      const result = evaluation.results[0];
      if (cacheKey && result) {
        const cachedResult: CachedExecutionResult = {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTime: result.executionTime,
        };

        await cacheService.set(cacheKey, cachedResult, RESULT_CACHE_TTL_SECONDS);
      }

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
