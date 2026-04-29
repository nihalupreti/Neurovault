import express from "express";
import { handleAsk } from "./qa.handler.js";
import {
  handleListConversations,
  handleCreateConversation,
  handleGetMessages,
  handleRenameConversation,
  handleDeleteConversation,
} from "./qa.conversation.handler.js";
import { rateLimiter } from "../auth/auth.rate-limiter.js";
import { asHandler } from "../../utils/as-handler.js";

const router = express.Router();

router.post("/ask", rateLimiter(), asHandler(handleAsk));

router.get("/conversations", asHandler(handleListConversations));
router.post("/conversations", asHandler(handleCreateConversation));
router.get("/conversations/:id/messages", asHandler(handleGetMessages));
router.patch("/conversations/:id", asHandler(handleRenameConversation));
router.delete("/conversations/:id", asHandler(handleDeleteConversation));

export default router;
