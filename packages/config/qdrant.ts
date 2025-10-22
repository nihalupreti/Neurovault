import { QdrantClient } from "@qdrant/js-client-rest";

let qdrantClient: QdrantClient | null = null;

/**
 * Initialize and return the Qdrant client singleton
 * @param host Qdrant host (default: localhost)
 * @param port Qdrant port (default: 6333)
 */
export function getQdrantClient(host = "localhost", port = 6333): QdrantClient {
  if (qdrantClient) return qdrantClient;

  qdrantClient = new QdrantClient({ host, port });
  console.log(`Qdrant client initialized at ${host}:${port}`);

  return qdrantClient;
}
