import Router from 'express';
import { submissionQueue } from "../queue/submission.queue.js";
import { createSubmission, getSubmission } from '../services/submission-service.js';

const router = Router();

router.post('/submit', async (req, res) => {
    const { language, code } = req.body;

    if (!code || !language) {
        return res.status(400).send('Code and language are required');
    }

    try {
        const submissionId = await createSubmission(language, code);

        await submissionQueue.add(
          "execute-submission",
          { submissionId },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        );

        return res.json({ submissionId });
    } catch (err: any) {
        return res.status(500).json({
            error: err.message || 'Internal Server Error'
        });
    }
});

router.get("/submission/:id", async (req, res) => {
   try {
       const submission = await getSubmission(req.params.id);
       if (!submission) return res.status(404).send('Submission not found');
       return res.json(submission);
   } catch (error) {
       return res.status(500).send('Server Error');
   }
});

export default router;