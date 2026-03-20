import { getQdrantClient } from "@neurovault/config";

const client = getQdrantClient();

export const searchResult = async (embeddings: number[]) => {
  const result = await client.query("neurovault", {
    query: embeddings,
    limit: 10,
    with_payload: true,
  });
  return result;
};

export const searchResultFiltered = async (
  embeddings: number[],
  fileIds: string[]
) => {
  const result = await client.query("neurovault", {
    query: embeddings,
    limit: 10,
    filter: {
      must: [{ key: "fileId", match: { any: fileIds } }],
    },
    with_payload: true,
  });
  return result;
};
