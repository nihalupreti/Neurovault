import { getQdrantClient } from "@neurovault/config";

const client = getQdrantClient();

export const searchResult = async (embeddings: number[]) => {
  const result = await client.query("neurovault", {
    query: embeddings,
    limit: 3,
    with_payload: true,
  });
  return result;
};
