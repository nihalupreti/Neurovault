import { getEmbeddings } from "@neurovault/utils/embeddings";
import { searchResult } from "./search-queries.js";

export const searchSimilarContent = async (query: string) => {
  const queryEmbeddings: number[] = await getEmbeddings(query);
  const similarities = await searchResult(queryEmbeddings);
  return similarities;
};
