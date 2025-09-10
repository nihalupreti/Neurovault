import { getEmbeddings } from "@neurovault/utils/embeddings";
import { searchResult } from "./search-queries.js";

export const searchSimilarContent = async (query: string) => {
  const queryEmbeddings = await getEmbeddings(query);
  const similarities = await searchResult(queryEmbeddings);
  console.log("result from query: ", similarities.points);
  return similarities;
};
