import { Worker } from "bullmq";
import { pool } from "../db/pool.js";
import { executeJavascript } from "../services/execution-service.js";

const worker = new Worker(
  "submission-queue",
  async (job) => {
    const submissionId = job.data.submissionId;

    // Fetch submission
    const result = await pool.query(
      `
      SELECT *
      FROM submissions
      WHERE id = $1
      `,
      [submissionId]
    );

    const submission = result.rows[0];

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // Mark running
    await pool.query(
      `
      UPDATE submissions
      SET status = 'running'
      WHERE id = $1
      `,
      [submissionId]
    );

    try {
      // Execute code
      const output = await executeJavascript(
        submission.code
      );

      // Save success
      await pool.query(
        `
        UPDATE submissions
        SET
          status = 'done',
          stdout = $1,
          stderr = $2
        WHERE id = $3
        `,
        [
          output.stdout,
          output.stderr,
          submissionId,
        ]
      );
    } catch (error: any) {
      // Save failure
      await pool.query(
        `
        UPDATE submissions
        SET
          status = 'failed',
          stderr = $1
        WHERE id = $2
        `,
        [
          error.message,
          submissionId,
        ]
      );
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

console.log("Worker started");