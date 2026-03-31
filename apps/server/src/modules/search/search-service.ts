import { getEmbeddings } from "@neurovault/utils/embeddings";
import { searchResult, searchResultFiltered } from "./search-queries.js";
import fileModel from "../files/fileMetadata.model.js";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchSemantic = async (query: string) => {
  const queryEmbeddings: number[] = await getEmbeddings(query);
  const similarities = await searchResult(queryEmbeddings);
  return similarities;
};

export const searchByFileName = async (pattern: string) => {
  const escaped = escapeRegex(pattern);
  const files = await fileModel
    .find({
      name: { $regex: new RegExp(escaped, "i") },
      type: "file",
    })
    .limit(20);
  return files;
};

export const searchCombined = async (
  filePattern: string,
  semanticQuery: string
) => {
  const files = await searchByFileName(filePattern);
  if (files.length === 0) return { points: [] };

  const fileIds = files.map((f) => f._id.toString());
  const queryEmbeddings: number[] = await getEmbeddings(semanticQuery);
  const similarities = await searchResultFiltered(queryEmbeddings, fileIds);
  return similarities;
};

export { searchSemantic as searchSimilarContent };
