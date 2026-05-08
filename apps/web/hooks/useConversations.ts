"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  getConversationMessages,
} from "@/api/client";
import type { Conversation, Message } from "@/api/client";

export function useConversations(contextType: string, contextId: string) {
  return useQuery<Conversation[]>({
    queryKey: ["conversations", contextType, contextId],
    queryFn: () => getConversations(contextType, contextId),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery<{ data: Message[] }>({
    queryKey: ["messages", conversationId],
    queryFn: () => getConversationMessages(conversationId!),
    enabled: !!conversationId,
    select: (res) => ({ data: res.data }),
  });
}

export function useCreateConversation(contextType: string, contextId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createConversation(contextType, contextId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", contextType, contextId] });
    },
  });
}

export function useDeleteConversation(contextType: string, contextId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", contextType, contextId] });
    },
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useInvalidateMessages() {
  const qc = useQueryClient();
  return (conversationId: string) => {
    qc.invalidateQueries({ queryKey: ["messages", conversationId] });
  };
}
