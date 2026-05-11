"use client";

import api from "./axios-instance";
import { ENDPOINTS } from "./endpoints";
import type {
  FileNode as FolderNode,
  FolderTreeResponse,
  SearchResult,
  SearchResponse,
  GraphStats,
  GraphNode as NeighborNode,
  NeighborsResponse,
  ClusterResponse,
  FullGraphResponse,
  ClustersResponse,
  BookSummary,
  BookChapter,
  ReadingProgress,
  BookAnnotation,
  RelatedContent,
  PaginatedResponse,
  Conversation,
  Message,
} from "@neurovault/shared/types";

export type {
  FolderNode,
  FolderTreeResponse,
  SearchResult,
  SearchResponse,
  GraphStats,
  NeighborNode,
  NeighborsResponse,
  ClusterResponse,
  FullGraphResponse,
  ClustersResponse,
  BookSummary,
  BookChapter,
  ReadingProgress,
  BookAnnotation,
  RelatedContent,
  PaginatedResponse,
  Conversation,
  Message,
};

export async function getFolderTree(parentId?: string): Promise<FolderTreeResponse> {
  const { data } = await api.get(ENDPOINTS.file.folderTree(parentId));
  return data.data;
}

export async function getFile(id: string): Promise<string> {
  const { data } = await api.get(ENDPOINTS.file.get(id));
  return data;
}

export async function search(query: string): Promise<SearchResponse> {
  const { data } = await api.get(ENDPOINTS.search.query(query));
  return data.data;
}

export async function getGraphStats(): Promise<GraphStats> {
  const { data } = await api.get(ENDPOINTS.graph.stats);
  return data.data;
}

export async function getNeighbors(fileId: string): Promise<NeighborsResponse> {
  const { data } = await api.get(ENDPOINTS.graph.neighbors(fileId));
  return data.data;
}

export async function getFileCluster(fileId: string): Promise<ClusterResponse> {
  const { data } = await api.get(ENDPOINTS.graph.cluster(fileId));
  return data.data;
}

export async function getFullGraph(): Promise<FullGraphResponse> {
  const { data } = await api.get(ENDPOINTS.graph.root);
  return data.data;
}

export async function getAllClusters(): Promise<ClustersResponse> {
  const { data } = await api.get(ENDPOINTS.graph.clusters);
  return data.data;
}

export async function listBooks(page = 1, limit = 20): Promise<PaginatedResponse<BookSummary>> {
  const { data } = await api.get(ENDPOINTS.books.list, { params: { page, limit } });
  return data;
}

export async function getBook(id: string): Promise<BookSummary> {
  const { data } = await api.get(ENDPOINTS.books.get(id));
  return data.data;
}

export async function getChapter(bookId: string, num: number): Promise<BookChapter> {
  const { data } = await api.get(ENDPOINTS.books.chapter(bookId, num));
  return data.data;
}

export async function importBook(
  file: File,
): Promise<{ bookId: string; title: string; totalChapters: number }> {
  const formData = new FormData();
  formData.append("book", file);
  const { data } = await api.post(ENDPOINTS.books.import, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export async function deleteBook(id: string): Promise<void> {
  await api.delete(ENDPOINTS.books.delete(id));
}

export async function getProgress(bookId: string): Promise<ReadingProgress> {
  const { data } = await api.get(ENDPOINTS.reader.progress(bookId));
  return data.data;
}

export async function updateProgress(
  bookId: string,
  partial: Partial<ReadingProgress>,
): Promise<ReadingProgress> {
  const { data } = await api.put(ENDPOINTS.reader.progress(bookId), partial);
  return data.data;
}

export async function listAnnotations(
  bookId: string,
  chapter?: number,
  type?: string,
  page = 1,
  limit = 100,
): Promise<PaginatedResponse<BookAnnotation>> {
  const params: Record<string, string> = { page: String(page), limit: String(limit) };
  if (chapter !== undefined) params.chapter = String(chapter);
  if (type !== undefined) params.type = type;
  const { data } = await api.get(ENDPOINTS.reader.annotations(bookId), { params });
  return data;
}

export async function createAnnotation(
  bookId: string,
  body: Omit<BookAnnotation, "_id" | "bookId" | "createdAt">,
): Promise<BookAnnotation> {
  const { data } = await api.post(ENDPOINTS.reader.annotations(bookId), body);
  return data.data;
}

export async function updateAnnotation(
  bookId: string,
  annotationId: string,
  updates: Partial<BookAnnotation>,
): Promise<BookAnnotation> {
  const { data } = await api.put(ENDPOINTS.reader.annotation(bookId, annotationId), updates);
  return data.data;
}

export async function deleteAnnotation(bookId: string, annotationId: string): Promise<void> {
  await api.delete(ENDPOINTS.reader.annotation(bookId, annotationId));
}

export async function getRelatedContent(
  bookId: string,
  sectionAnchor: string,
  limit?: number,
): Promise<{ results: RelatedContent[] }> {
  const params: Record<string, string> = {};
  if (limit !== undefined) params.limit = String(limit);
  const { data } = await api.get(ENDPOINTS.reader.related(bookId, sectionAnchor), { params });
  return data.data;
}

export async function uploadFiles(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<unknown> {
  const { data } = await api.post(endpoint, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return data;
}

export async function getConversations(
  contextType: string,
  contextId: string,
): Promise<Conversation[]> {
  const { data } = await api.get(ENDPOINTS.qa.conversations, {
    params: { contextType, contextId },
  });
  return data.data;
}

export async function createConversation(
  contextType: string,
  contextId: string,
): Promise<Conversation> {
  const { data } = await api.post(ENDPOINTS.qa.conversations, {
    contextType,
    contextId,
  });
  return data.data;
}

export async function getConversationMessages(
  conversationId: string,
  page = 1,
  limit = 100,
): Promise<PaginatedResponse<Message>> {
  const { data } = await api.get(ENDPOINTS.qa.conversationMessages(conversationId), {
    params: { page, limit },
  });
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(ENDPOINTS.qa.conversation(id));
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const { data } = await api.patch(ENDPOINTS.qa.conversation(id), { title });
  return data.data;
}
