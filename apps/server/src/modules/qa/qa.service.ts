import { getEmbeddings } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";
import { createProvider } from "./providers/index.js";
import { buildSystemPrompt } from "./qa.prompts.js";
import SectionContent from "../chunker/chunker.section.model.js";
import type { ChatMessage, Citation, RetrievedChunk } from "./providers/types.js";

interface QdrantScoredPoint {
  id: string | number;
  score: number;
  payload?: Record<string, unknown> | null;
}

let _provider: ReturnType<typeof createProvider> | null = null;
function getProvider() {
  if (!_provider) _provider = createProvider();
  return _provider;
}

interface AskParams {
  question: string;
  history?: ChatMessage[];
  limit?: number;
  scope?: "chapter" | "book" | "connected";
  bookId?: string;
  chapterNumber?: number;
}

interface AskResult {
  stream: AsyncIterable<string>;
  citations: Citation[];
}

const NO_RESULTS_MSG =
  "I couldn't find any relevant notes for this question. Try rephrasing or adding more notes to your vault.";

export async function askQuestion(params: AskParams): Promise<AskResult> {
  const { question, history = [], limit = 5 } = params;

  const queryEmbedding = await getEmbeddings(question, "query");
  const client = getQdrantClient();

  let points: QdrantScoredPoint[];

  if (params.scope === "connected" && params.bookId && params.chapterNumber !== undefined) {
    const [chapterResult, vaultResult] = await Promise.all([
      client.query("neurovault", {
        query: queryEmbedding,
        limit: Math.ceil(limit / 2),
        filter: {
          must: [
            { key: "bookId", match: { value: params.bookId } },
            { key: "chapterNumber", match: { value: params.chapterNumber } },
          ],
        },
        with_payload: true,
      }),
      client.query("neurovault", {
        query: queryEmbedding,
        limit: Math.ceil(limit / 2),
        filter: {
          must_not: [{ key: "bookId", match: { value: params.bookId } }],
        },
        with_payload: true,
      }),
    ]);
    points = [...(chapterResult.points || []), ...(vaultResult.points || [])];
  } else {
    let filter: Record<string, unknown> | undefined = undefined;

    if (params.scope && params.bookId) {
      if (params.scope === "chapter" && params.chapterNumber !== undefined) {
        filter = {
          must: [
            { key: "bookId", match: { value: params.bookId } },
            { key: "chapterNumber", match: { value: params.chapterNumber } },
          ],
        };
      } else if (params.scope === "book") {
        filter = {
          must: [{ key: "bookId", match: { value: params.bookId } }],
        };
      }
    }

    const searchResult = await client.query("neurovault", {
      query: queryEmbedding,
      limit,
      filter,
      with_payload: true,
    });
    points = searchResult.points || [];
  }

  const chunks: RetrievedChunk[] = points.map((p: QdrantScoredPoint) => ({
    fileId: String(p.payload?.fileId ?? ""),
    fileName: String(p.payload?.fileName ?? ""),
    text: String(p.payload?.text ?? ""),
    chunkIndex: Number(p.payload?.chunk_index ?? 0),
    score: p.score ?? 0,
    headingPath: Array.isArray(p.payload?.headingPath) ? (p.payload.headingPath as string[]) : [],
  }));

  for (const chunk of chunks) {
    const sId = points.find((p: QdrantScoredPoint) => String(p.payload?.text) === chunk.text)
      ?.payload?.sectionId;
    if (!sId) continue;
    const section = await SectionContent.findOne({ sectionId: String(sId) }).lean();
    if (
      section &&
      typeof section.content === "string" &&
      section.content.length > chunk.text.length
    ) {
      chunk.text = section.content;
    }
  }

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
  const recentHistory = history;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: question },
  ];

  const stream = getProvider().chatStream({ messages });

  return { stream, citations };
}

export async function generateTitle(question: string): Promise<string> {
  const provider = getProvider();
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Generate a concise 3-6 word title for a conversation that starts with this question. Reply with ONLY the title, no quotes or punctuation:\n\n${question}`,
    },
  ];

  let title = "";
  for await (const token of provider.chatStream({
    messages,
    maxTokens: 30,
    temperature: 0.5,
  })) {
    title += token;
  }

  return title.trim() || question.slice(0, 50);
}
