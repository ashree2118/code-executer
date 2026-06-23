import { Worker } from "bullmq";
import { redisConnection } from "../lib/redis.js";
import { executeJavascript } from "../services/execution-service.js";
import {
  getSubmission,
  updateSubmissionStatus,
  saveExecutionResult,
  markFailed,
} from "../services/submission-service.js";

const worker = new Worker(
  "submission-queue",
  async (job) => {
    const { submissionId } = job.data;

    const submission = await getSubmission(
      submissionId
    );

    if (!submission) {
      throw new Error(
        `Submission ${submissionId} not found`
      );
    }

    await updateSubmissionStatus(
      submissionId,
      "running"
    );

    try {
      const output =
        await executeJavascript(
          submission.code
        );

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

worker.on(
  "failed",
  async (job, err) => {
    console.error(
      `Job ${job?.id} failed`,
      err.message
    );
  }
);

console.log("Worker started");