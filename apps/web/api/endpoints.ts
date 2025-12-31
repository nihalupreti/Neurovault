const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const ENDPOINTS = {
  file: {
    upload: `${BASE}/api/file/upload/file`,
    uploadFolder: `${BASE}/api/file/upload/folder`,
    get: (id: string) => `${BASE}/api/file?id=${id}`,
    folderTree: (parentId?: string) =>
      parentId
        ? `${BASE}/api/file/folder?parentId=${parentId}`
        : `${BASE}/api/file/folder`,
  },
  search: {
    query: (q: string) => `${BASE}/api/search?q=${encodeURIComponent(q)}`,
  },
  qa: {
    ask: `${BASE}/api/qa/ask`,
  },
  graph: {
    root: `${BASE}/api/graph`,
    neighbors: (fileId: string) =>
      `${BASE}/api/graph/file/${fileId}/neighbors`,
    cluster: (fileId: string) =>
      `${BASE}/api/graph/file/${fileId}/cluster`,
    clusters: `${BASE}/api/graph/clusters`,
    stats: `${BASE}/api/graph/stats`,
    rebuild: `${BASE}/api/graph/rebuild`,
  },
} as const;
