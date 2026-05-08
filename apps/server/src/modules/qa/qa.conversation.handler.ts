import type { Request, Response } from "express";
import {
  listConversations,
  createConversation,
  getConversationOrThrow,
  renameConversation,
  deleteConversation,
  getMessages,
} from "./qa.conversation.service.js";
import { createConversationSchema, renameConversationSchema } from "@neurovault/shared/schemas";
import { apiSuccess, apiCreated, apiNoContent, apiPaginated } from "../../utils/api-response.js";
import { parsePagination } from "../../utils/pagination.js";

export const handleListConversations = async (req: Request, res: Response) => {
  const contextType = req.query.contextType as string;
  const contextId = req.query.contextId as string;
  const conversations = await listConversations(contextType, contextId);
  return apiSuccess(res, conversations);
};

export const handleCreateConversation = async (req: Request, res: Response) => {
  const { contextType, contextId } = createConversationSchema.parse(req.body);
  const conversation = await createConversation(contextType, contextId);
  return apiCreated(res, conversation);
};

export const handleGetMessages = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  await getConversationOrThrow(id);
  const { page, limit, skip } = parsePagination(req);
  const [messages, total] = await getMessages(id, skip, limit);
  return apiPaginated(res, messages, page, limit, total);
};

export const handleRenameConversation = async (req: Request<{ id: string }>, res: Response) => {
  const { title } = renameConversationSchema.parse(req.body);
  const conversation = await renameConversation(req.params.id, title);
  return apiSuccess(res, conversation);
};

export const handleDeleteConversation = async (req: Request<{ id: string }>, res: Response) => {
  await deleteConversation(req.params.id);
  return apiNoContent(res);
};
