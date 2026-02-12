import { getEmbeddings } from "@neurovault/utils/embeddings";
import { searchResult, searchResultFiltered } from "./search-queries.js";
import { reciprocalRankFusion } from "./rrf.js";
import ChunkText from "./chunk-text.model.js";
import fileModel from "../files/fileMetadata.model.js";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchSemantic = async (query: string, fileIds?: string[]) => {
  const queryEmbeddings: number[] = await getEmbeddings(query);
  if (fileIds) {
    return searchResultFiltered(queryEmbeddings, fileIds);
  }
  return searchResult(queryEmbeddings);
};

export const searchKeyword = async (query: string, fileIds?: string[]) => {
  const filter: any = { $text: { $search: query } };
  if (fileIds) filter.fileId = { $in: fileIds };

  const docs = await ChunkText.find(filter, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" } })
    .limit(20)
    .lean();

  return docs.map((doc: any) => ({
    id: `${doc.fileId}:${doc.chunkIndex}`,
    payload: {
      text: doc.text,
      fileId: doc.fileId,
      chunk_index: doc.chunkIndex,
    },
  }));
};

export const searchHybrid = async (query: string, fileIds?: string[]) => {
  let textResults: { id: string; payload: any }[] = [];
  let vectorResults: { id: string; payload: any }[] = [];

  const [textRes, vectorRes] = await Promise.allSettled([
    searchKeyword(query, fileIds),
    searchSemantic(query, fileIds),
  ]);

  if (textRes.status === "fulfilled") {
    textResults = textRes.value;
  } else {
    console.warn("Text search failed, degrading to semantic only:", textRes.reason);
  }

  if (vectorRes.status === "fulfilled") {
    const points = vectorRes.value.points || [];
    vectorResults = points.map((p: any) => ({
      id: `${p.payload?.fileId}:${p.payload?.chunk_index}`,
      payload: {
        text: p.payload?.text ?? "",
        fileId: p.payload?.fileId ?? "",
        chunk_index: p.payload?.chunk_index ?? 0,
      },
    }));
  } else {
    console.warn("Vector search failed, degrading to text only:", vectorRes.reason);
  }

  if (textResults.length === 0 && vectorResults.length === 0) {
    return [];
  }

  return reciprocalRankFusion([textResults, vectorResults]);
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

export { searchSemantic as searchSimilarContent };
