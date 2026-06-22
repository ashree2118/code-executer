import Router from 'express';
import { pool } from "../db/pool.js";
import { submissionQueue } from "../queue/submission.queue.js";

const router = Router();
router.get("/health/db", async (_, res) => {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
});
router.post('/submit', async (req, res) => {
    const { language, code } = req.body;

    //validate if the code and language are present
    if (!code || !language) {
        return res.status(400).send('Code and language are required');
    }
    if (language != 'javascript') {
        return res.status(400).send('Only JavaScript code is supported');
    }

    try {
        const result = await pool.query(
            `
INSERT INTO submissions
(language, code, status)
VALUES ($1, $2, 'pending')
RETURNING id
`,
            [language, code]
        );

        const submissionId = result.rows[0].id;
        await submissionQueue.add(
            "execute-submission",
            {
                submissionId,
            }
        );
        return res.json({
            submissionId,
        });
    } catch (err: any) {
        res.json({
            stdout: err.stdout?.toString() ?? '',
            stderr: err.stderr?.toString() ?? err.message,
            exitCode: err.status ?? 1
        });
    } finally {
        console.log(`Executed code in language: ${language}`);
    }

});

router.get(
  "/submission/:id",
  async (req, res) => {

    const result =
      await pool.query(
      `
      SELECT *
      FROM submissions
      WHERE id=$1
      `,
      [req.params.id]
    );

    res.json(result.rows[0]);
  }
);

export default router;