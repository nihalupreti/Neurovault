import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { promises as fs } from "fs";
import { getEmbeddings } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";

const client = getQdrantClient();

let globalId = 0;

export async function processMarkdown(filePath: string, fileId: string) {
  const text = await fs.readFile(filePath, "utf-8");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 0,
  });

  const chunks = await splitter.createDocuments([text]);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]?.pageContent;
    if (!chunk) continue;

    const embedding = await getEmbeddings(chunk);

    await client.upsert("neurovault", {
      wait: true,
      points: [
        {
          id: globalId++,
          vector: embedding,
          payload: {
            text: chunk,
            fileId,
            chunk_index: i,
          },
        },
      ],
    });

    console.log(`Uploaded chunk ${i + 1}/${chunks.length} from ${filePath}`);
  }
}
