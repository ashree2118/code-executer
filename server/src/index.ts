import express from "express";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
import route from "./routes/route.js";

const app = express();
app.use(express.json());

app.use(rateLimitMiddleware);
app.use("/api", route);

app.listen(3000, () => { console.log("server running on port 3000")});
