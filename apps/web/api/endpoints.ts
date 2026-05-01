const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const ENDPOINTS = {
  auth: {
    login: `${BASE}/api/auth/login`,
    usage: `${BASE}/api/auth/usage`,
  },
  file: {
    upload: `${BASE}/api/file/upload/file`,
    uploadFolder: `${BASE}/api/file/upload/folder`,
    get: (id: string) => `${BASE}/api/file?id=${id}`,
    folderTree: (parentId?: string) =>
      parentId
        ? `${BASE}/api/file/folder?parentId=${parentId}`
        : `${BASE}/api/file/folder`,
    visibility: (id: string) => `${BASE}/api/file/${id}/visibility`,
  },
  search: {
    query: (q: string) => `${BASE}/api/search?q=${encodeURIComponent(q)}`,
  },
  qa: {
    ask: `${BASE}/api/qa/ask`,
    conversations: `${BASE}/api/qa/conversations`,
    conversationMessages: (id: string) => `${BASE}/api/qa/conversations/${id}/messages`,
    conversation: (id: string) => `${BASE}/api/qa/conversations/${id}`,
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
  capture: {
    create: `${BASE}/api/capture`,
  },
  books: {
    list: `${BASE}/api/books`,
    get: (id: string) => `${BASE}/api/books/${id}`,
    chapter: (id: string, num: number) => `${BASE}/api/books/${id}/chapters/${num}`,
    import: `${BASE}/api/books/import`,
    delete: (id: string) => `${BASE}/api/books/${id}`,
  },
  reader: {
    progress: (bookId: string) => `${BASE}/api/reader/${bookId}/progress`,
    annotations: (bookId: string) => `${BASE}/api/reader/${bookId}/annotations`,
    annotation: (bookId: string, id: string) => `${BASE}/api/reader/${bookId}/annotations/${id}`,
    related: (bookId: string, anchor: string) => `${BASE}/api/reader/${bookId}/related/${anchor}`,
    exportObsidian: (bookId: string) => `${BASE}/api/reader/${bookId}/export/obsidian`,
  },
} as const;
