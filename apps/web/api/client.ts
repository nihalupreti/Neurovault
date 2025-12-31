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
