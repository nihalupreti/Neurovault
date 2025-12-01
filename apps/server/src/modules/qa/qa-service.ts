import { getEmbeddings } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";
import { createProvider } from "./providers/index.js";
import { buildSystemPrompt } from "./qa-prompts.js";
import type { ChatMessage, Citation, RetrievedChunk } from "./providers/types.js";

const provider = createProvider();

interface AskParams {
  question: string;
  history?: ChatMessage[];
  limit?: number;
}

interface AskResult {
  stream: AsyncIterable<string>;
  citations: Citation[];
}

const NO_RESULTS_MSG =
  "I couldn't find any relevant notes for this question. Try rephrasing or adding more notes to your vault.";

export async function askQuestion(params: AskParams): Promise<AskResult> {
  const { question, history = [], limit = 5 } = params;

  const queryEmbedding = await getEmbeddings(question);
  const client = getQdrantClient();
  const searchResult = await client.query("neurovault", {
    query: queryEmbedding,
    limit,
    with_payload: true,
  });

  const chunks: RetrievedChunk[] = (searchResult.points || []).map((p: any) => ({
    fileId: p.payload?.fileId ?? "",
    fileName: p.payload?.fileName ?? "",
    text: p.payload?.text ?? "",
    chunkIndex: p.payload?.chunk_index ?? 0,
    score: p.score ?? 0,
  }));

  if (chunks.length === 0) {
    return {
      stream: (async function* () {
        yield NO_RESULTS_MSG;
      })(),
      citations: [],
    };
  }

  const citations: Citation[] = chunks.map((chunk, i) => ({
    sourceIndex: i + 1,
    fileId: chunk.fileId,
    fileName: chunk.fileName,
    excerpt: chunk.text,
  }));

  const systemPrompt = buildSystemPrompt(chunks);
  const recentHistory = history.slice(-6);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: question },
  ];

  const stream = provider.chatStream({ messages });

  return { stream, citations };
}
