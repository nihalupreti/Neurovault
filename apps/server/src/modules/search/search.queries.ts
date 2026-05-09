import { getQdrantClient } from "@neurovault/config";

const client = getQdrantClient();

export const searchResult = async (embeddings: number[], limit = 10) => {
  const result = await client.query("neurovault", {
    query: embeddings,
    limit,
    with_payload: true,
  });
  return result;
};

export const searchResultFiltered = async (
  embeddings: number[],
  fileIds: string[],
  limit = 10,
) => {
  const result = await client.query("neurovault", {
    query: embeddings,
    limit,
    filter: {
      must: [{ key: "fileId", match: { any: fileIds } }],
    },
    with_payload: true,
  });
  return result;
};
