export interface SearchResult {
  id: string;
  score: number;
  type: "file" | "semantic";
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
