"use client";

import axios from "axios";
import { ENDPOINTS } from "./endpoints";

export interface FolderNode {
  _id: string;
  name: string;
  type: "file" | "folder";
  children?: FolderNode[];
}

export interface FolderTreeResponse {
  _id?: string;
  name: string;
  children: FolderNode[];
}

export interface SearchResult {
  id: string;
  score: number;
  type: string;
  payload: {
    text: string;
    fileId: string;
    fileName: string;
    chunk_index: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  parsed: {
    hybrid: string | null;
    semantic: string | null;
    keyword: string | null;
    file: string | null;
  };
  searchTime: number;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  topConnected: Array<{
    fileId: string;
    fileName: string;
    path: string;
    clusterId?: number;
    degree: number;
  }>;
}

export interface NeighborNode {
  fileId: string;
  fileName: string;
  path: string;
  clusterId?: number;
}

export interface NeighborsResponse {
  explicit: Array<NeighborNode & { anchor: string }>;
  implicit: Array<NeighborNode & { score: number }>;
}

export interface ClusterResponse {
  clusterId: number;
  members: NeighborNode[];
}

export async function getFolderTree(
  parentId?: string
): Promise<FolderTreeResponse> {
  const { data } = await axios.get(ENDPOINTS.file.folderTree(parentId));
  return data;
}

export async function getFile(id: string): Promise<string> {
  const { data } = await axios.get(ENDPOINTS.file.get(id));
  return data;
}

export async function search(query: string): Promise<SearchResponse> {
  const { data } = await axios.get(ENDPOINTS.search.query(query));
  return data;
}

export async function getGraphStats(): Promise<GraphStats> {
  const { data } = await axios.get(ENDPOINTS.graph.stats);
  return data;
}

export async function getNeighbors(
  fileId: string
): Promise<NeighborsResponse> {
  const { data } = await axios.get(ENDPOINTS.graph.neighbors(fileId));
  return data;
}

export async function getFileCluster(
  fileId: string
): Promise<ClusterResponse> {
  const { data } = await axios.get(ENDPOINTS.graph.cluster(fileId));
  return data;
}

export interface BookSummary {
  _id: string;
  title: string;
  topic: string;
  totalChapters: number;
  chapters: Array<{ number: number; title: string; sectionAnchors: string[] }>;
  createdAt: string;
}

export interface BookChapter {
  _id: string;
  bookId: string;
  number: number;
  title: string;
  htmlContent: string;
  sections: Array<{ anchor: string; title: string; level: number }>;
}

export interface ReadingProgress {
  bookId: string;
  currentChapter: number;
  scrollPosition: number;
  chaptersCompleted: number[];
  timeSpentMinutes: Record<string, number>;
  lastReadAt: string;
}

export interface BookAnnotation {
  _id: string;
  bookId: string;
  chapterNumber: number;
  sectionAnchor: string;
  type: "highlight" | "note" | "vault-link";
  textRange: { startOffset: number; endOffset: number };
  highlightedText: string;
  color: string;
  noteContent?: string;
  linkedNoteId?: string;
  createdAt: string;
}

export interface RelatedContent {
  sourceType: string;
  fileId: string;
  score: number;
  snippet: string;
  bookId?: string;
  bookTitle?: string;
  chapterNumber?: number;
  sectionAnchor?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function listBooks(page = 1, limit = 20): Promise<PaginatedResponse<BookSummary>> {
  const { data } = await axios.get(ENDPOINTS.books.list, { params: { page, limit } });
  return data;
}

export async function getBook(id: string): Promise<BookSummary> {
  const { data } = await axios.get(ENDPOINTS.books.get(id));
  return data;
}

export async function getChapter(bookId: string, num: number): Promise<BookChapter> {
  const { data } = await axios.get(ENDPOINTS.books.chapter(bookId, num));
  return data;
}

export async function importBook(file: File): Promise<{ bookId: string; title: string; totalChapters: number }> {
  const formData = new FormData();
  formData.append("book", file);
  const { data } = await axios.post(ENDPOINTS.books.import, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteBook(id: string): Promise<void> {
  await axios.delete(ENDPOINTS.books.delete(id));
}

export async function getProgress(bookId: string): Promise<ReadingProgress> {
  const { data } = await axios.get(ENDPOINTS.reader.progress(bookId));
  return data;
}

export async function updateProgress(
  bookId: string,
  partial: Partial<ReadingProgress>
): Promise<ReadingProgress> {
  const { data } = await axios.put(ENDPOINTS.reader.progress(bookId), partial);
  return data;
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
  const { data } = await axios.get(ENDPOINTS.reader.annotations(bookId), { params });
  return data;
}

export async function createAnnotation(
  bookId: string,
  body: Omit<BookAnnotation, "_id" | "bookId" | "createdAt">
): Promise<BookAnnotation> {
  const { data } = await axios.post(ENDPOINTS.reader.annotations(bookId), body);
  return data;
}

export async function updateAnnotation(
  bookId: string,
  annotationId: string,
  updates: Partial<BookAnnotation>
): Promise<BookAnnotation> {
  const { data } = await axios.put(ENDPOINTS.reader.annotation(bookId, annotationId), updates);
  return data;
}

export async function deleteAnnotation(bookId: string, annotationId: string): Promise<void> {
  await axios.delete(ENDPOINTS.reader.annotation(bookId, annotationId));
}

export async function getRelatedContent(
  bookId: string,
  sectionAnchor: string,
  limit?: number
): Promise<{ results: RelatedContent[] }> {
  const params: Record<string, string> = {};
  if (limit !== undefined) params.limit = String(limit);
  const { data } = await axios.get(ENDPOINTS.reader.related(bookId, sectionAnchor), { params });
  return data;
}

export async function uploadFiles(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<unknown> {
  const { data } = await axios.post(
    endpoint,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }
  );
  return data;
}
