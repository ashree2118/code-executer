import express from 'express';
import route from './routes/route.js';
import { submissionQueue } from "./queue/submission.queue.js";

const app = express();
app.use(express.json());

app.use('/api', route);
app.post("/test", async () => {
  await submissionQueue.add("hello", {
    message: "BullMQ works",
  });

  return {
    success: true,
  };
});

app.listen(3000, () => { console.log('server running on port 3000')});