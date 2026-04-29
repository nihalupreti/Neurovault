import { Conversation } from "./qa.conversation.model.js";
import { QAMessage } from "./qa.message.model.js";
import { ConversationNotFoundError } from "./qa.errors.js";

export async function listConversations(contextType: string, contextId: string) {
  return Conversation.find({ contextType, contextId })
    .sort({ updatedAt: -1 })
    .lean();
}

export async function createConversation(contextType: string, contextId: string) {
  const conv = await Conversation.create({ contextType, contextId });
  return conv.toObject();
}

export async function getConversationOrThrow(id: string) {
  const conv = await Conversation.findById(id).lean();
  if (!conv) throw new ConversationNotFoundError(id);
  return conv;
}

export async function renameConversation(id: string, title: string) {
  const conv = await Conversation.findByIdAndUpdate(
    id,
    { title },
    { new: true },
  ).lean();
  if (!conv) throw new ConversationNotFoundError(id);
  return conv;
}

export async function deleteConversation(id: string) {
  const conv = await Conversation.findByIdAndDelete(id);
  if (!conv) throw new ConversationNotFoundError(id);
  await QAMessage.deleteMany({ conversationId: id });
}

export async function getMessages(conversationId: string, skip: number, limit: number) {
  return Promise.all([
    QAMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    QAMessage.countDocuments({ conversationId }),
  ]);
}

export async function loadConversationHistory(conversationId: string) {
  return QAMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .select({ role: 1, content: 1, _id: 0 })
    .lean();
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citations: Array<{ sourceIndex: number; fileId: string; fileName: string; excerpt: string }> = [],
) {
  const msg = await QAMessage.create({ conversationId, role, content, citations });
  await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });
  return msg.toObject();
}

export async function getConversationMessageCount(conversationId: string) {
  return QAMessage.countDocuments({ conversationId });
}
