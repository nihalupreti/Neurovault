import express from "express";
import { handleAsk } from "./qa-handler.js";
import { rateLimiter } from "../auth/rate-limiter.js";

const router = express.Router();

router.post("/ask", rateLimiter(), handleAsk);

export default router;
