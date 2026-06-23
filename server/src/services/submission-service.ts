import { pool } from "../db/pool.js";

export async function getSubmission(id: string) {
   const result = await pool.query(
      `
      SELECT *
      FROM submissions
      WHERE id = $1
      `,
      [id]
   );

   return result.rows[0];
}

export async function createSubmission(language: string, code: string) {
   const result = await pool.query(
     `
     INSERT INTO submissions
     (language, code, status)
     VALUES ($1, $2, 'pending')
     RETURNING id
     `,
     [language, code]
   );
    return result.rows[0].id;
};

export async function updateSubmissionStatus(id: string, status: string, stdout?: string, stderr?: string) {
   await pool.query(
     `
     UPDATE submissions
     SET status = $1, stdout = $2, stderr = $3
     WHERE id = $4
     `,
     [status, stdout, stderr, id]
   );
};

export async function saveExecutionResult(id: string, stdout: string, stderr: string) {
   await pool.query(
     `
     UPDATE submissions
     SET stdout = $1, stderr = $2
     WHERE id = $3
     `,
     [stdout, stderr, id]
   );
}

export async function markFailed(id: string, stdout: string, stderr: string) {
   await pool.query(
     `
     UPDATE submissions
     SET status = 'failed', stdout = $1, stderr = $2
     WHERE id = $3
     `,
     [stdout, stderr, id]
   );
};
