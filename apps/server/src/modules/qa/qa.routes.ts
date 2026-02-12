import express from "express";
import { handleAsk } from "./qa.handler.js";
import { rateLimiter } from "../auth/auth.rate-limiter.js";
import { asHandler } from "../../utils/as-handler.js";

const router = express.Router();

router.post("/ask", rateLimiter(), asHandler(handleAsk));

export default router;
