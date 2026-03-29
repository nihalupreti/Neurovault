import express from "express";
import { handleAsk } from "./qa-handler.js";

const router = express.Router();

router.post("/ask", handleAsk);

export default router;
