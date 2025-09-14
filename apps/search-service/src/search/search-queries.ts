import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({ host: "localhost", port: 6333 });

export const searchResult = async (embeddings: number[]) => {
  const result = await client.query("test_collection", {
    query: embeddings,
    limit: 3,
    with_payload: true,
  });
  return result;
};
