import { getEmbeddings, rerankDocuments } from "@neurovault/utils/embeddings";
import { getQdrantClient } from "@neurovault/config";
import { createProvider } from "./providers/index.js";
import { buildSystemPrompt } from "./qa.prompts.js";
import { mmrSelect, type RankedCandidate } from "./qa.mmr.js";
import SectionContent from "../chunker/chunker.section.model.js";
import ChunkText from "../search/search.chunk-text.model.js";
import { reciprocalRankFusion } from "../search/search.rrf.js";
import type { ChatMessage, Citation, RetrievedChunk } from "./providers/types.js";


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
  contextItems?: Array<{
    type: "selection" | "file";
    fileId: string;
    fileName: string;
    excerpt?: string;
  }>;
}

interface AskResult {
  stream: AsyncIterable<string>;
  citations: Citation[];
}

const RERANK_POOL = 20;   // how many RRF results to collect
const MMR_POOL = 12;      // diverse subset to send to reranker
const RERANK_TOP = 6;     // final chunks sent to LLM
const RELEVANCE_THRESHOLD = 0.1;

const NO_RESULTS_MSG =
  "I couldn't find any relevant notes for this question. Try rephrasing or adding more notes to your vault.";

async function hybridRetrieve(
  question: string,
  queryEmbedding: number[],
  qdrantFilter: Record<string, unknown> | undefined,
  mongoFilter: Record<string, unknown> | undefined,
  limit: number,
): Promise<RetrievedChunk[]> {
  const client = getQdrantClient();

  const [textRes, vectorRes] = await Promise.allSettled([
    ChunkText.find(
      { $text: { $search: question }, ...mongoFilter },
      { score: { $meta: "textScore" } },
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(RERANK_POOL)
      .lean(),
    client.query("neurovault", {
      query: queryEmbedding,
      limit: RERANK_POOL,
      filter: qdrantFilter,
      with_payload: true,
      with_vector: true,
    }),
  ]);

  type RRFItem = { id: string; payload: Record<string, unknown> };
  const textResults: RRFItem[] =
    textRes.status === "fulfilled"
      ? textRes.value.map((doc) => ({
          id: `${doc.fileId}:${doc.chunkIndex}`,
          payload: {
            text: doc.text,
            fileId: doc.fileId,
            fileName: "",
            chunk_index: doc.chunkIndex,
            sectionId: doc.sectionId ?? "",
            headingPath: doc.headingPath ?? [],
          },
        }))
      : [];

  // store vector alongside payload so it survives RRF
  const vectorResults: RRFItem[] =
    vectorRes.status === "fulfilled"
      ? (vectorRes.value.points || []).map((p) => ({
          id: `${p.payload?.fileId}:${p.payload?.chunk_index}`,
          payload: {
            text: p.payload?.text ?? "",
            fileId: p.payload?.fileId ?? "",
            fileName: p.payload?.fileName ?? "",
            chunk_index: p.payload?.chunk_index ?? 0,
            sectionId: p.payload?.sectionId ?? "",
            headingPath: p.payload?.headingPath ?? [],
            _vector: Array.isArray(p.vector) ? p.vector : undefined,
          },
        }))
      : [];

  if (textResults.length === 0 && vectorResults.length === 0) return [];

  const fused = reciprocalRankFusion([textResults, vectorResults]);
  const pool = fused.slice(0, RERANK_POOL);
  if (pool.length === 0) return [];

  // --- Step 1: MMR on the RRF pool for diversity ---
  const mmrCandidates: RankedCandidate[] = pool.map((item) => ({
    chunk: {
      fileId: String(item.payload.fileId ?? ""),
      fileName: String(item.payload.fileName ?? ""),
      text: String(item.payload.text ?? ""),
      chunkIndex: Number(item.payload.chunk_index ?? 0),
      score: item.score,
      headingPath: Array.isArray(item.payload.headingPath)
        ? (item.payload.headingPath as string[])
        : [],
      sectionId: String(item.payload.sectionId ?? ""),
    },
    relevance: item.score,
    vector: Array.isArray(item.payload._vector)
      ? (item.payload._vector as number[])
      : undefined,
  }));

  const mmrPool = mmrSelect(mmrCandidates, Math.min(MMR_POOL, pool.length));

  // --- Step 2: Rerank the diverse MMR pool ---
  const documents = mmrPool.map((c) => c.text);
  let reranked: { index: number; relevance_score: number }[];
  try {
    reranked = await rerankDocuments(question, documents, Math.min(limit, mmrPool.length));
  } catch {
    reranked = mmrPool
      .slice(0, limit)
      .map((_, i) => ({ index: i, relevance_score: 1 }));
  }

  return reranked
    .filter((r) => r.relevance_score >= RELEVANCE_THRESHOLD)
    .map((r) => mmrPool[r.index]!);
}

export async function askQuestion(params: AskParams): Promise<AskResult> {
  const { question, history = [], limit = RERANK_TOP, contextItems } = params;

  const queryEmbedding = await getEmbeddings(question, "query");

  const pinnedChunks: RetrievedChunk[] = [];
  const pinnedFileIds = new Set<string>();

  if (contextItems && contextItems.length > 0) {
    const fileItems = contextItems.filter((item) => item.type === "file");
    const selectionItems = contextItems.filter((item) => item.type === "selection");

    for (const item of selectionItems) {
      pinnedFileIds.add(item.fileId);
      pinnedChunks.push({
        fileId: item.fileId,
        fileName: item.fileName,
        text: item.excerpt ?? "",
        chunkIndex: 0,
        score: 1,
        headingPath: [],
      });
    }

    const fileResults = await Promise.all(
      fileItems.map((item) =>
        hybridRetrieve(
          question,
          queryEmbedding,
          { must: [{ key: "fileId", match: { value: item.fileId } }] },
          { fileId: item.fileId },
          3,
        ),
      ),
    );

    for (let i = 0; i < fileItems.length; i++) {
      pinnedFileIds.add(fileItems[i]!.fileId);
      pinnedChunks.push(...fileResults[i]!);
    }
  }

  const vaultLimit = contextItems && contextItems.length > 0 ? 3 : limit;
  let chunks: RetrievedChunk[];

  if (params.scope === "connected" && params.bookId && params.chapterNumber !== undefined) {
    const [chapterChunks, vaultChunks] = await Promise.all([
      hybridRetrieve(
        question,
        queryEmbedding,
        {
          must: [
            { key: "bookId", match: { value: params.bookId } },
            { key: "chapterNumber", match: { value: params.chapterNumber } },
          ],
        },
        { bookId: params.bookId, chapterNumber: params.chapterNumber },
        Math.ceil(vaultLimit / 2),
      ),
      hybridRetrieve(
        question,
        queryEmbedding,
        { must_not: [{ key: "bookId", match: { value: params.bookId } }] },
        { bookId: { $ne: params.bookId } },
        Math.ceil(vaultLimit / 2),
      ),
    ]);
    chunks = [...pinnedChunks, ...chapterChunks, ...vaultChunks];
  } else {
    let qdrantFilter: Record<string, unknown> | undefined;
    let mongoFilter: Record<string, unknown> | undefined;

    if (params.scope === "chapter" && params.bookId && params.chapterNumber !== undefined) {
      qdrantFilter = {
        must: [
          { key: "bookId", match: { value: params.bookId } },
          { key: "chapterNumber", match: { value: params.chapterNumber } },
        ],
      };
      mongoFilter = { bookId: params.bookId, chapterNumber: params.chapterNumber };
    } else if (params.scope === "book" && params.bookId) {
      qdrantFilter = { must: [{ key: "bookId", match: { value: params.bookId } }] };
      mongoFilter = { bookId: params.bookId };
    }

    if (pinnedFileIds.size > 0) {
      const exclude = Array.from(pinnedFileIds);
      qdrantFilter = {
        ...qdrantFilter,
        must_not: [{ key: "fileId", match: { any: exclude } }],
      };
      mongoFilter = { ...mongoFilter, fileId: { $nin: exclude } };
    }

    const vaultChunks = await hybridRetrieve(
      question,
      queryEmbedding,
      qdrantFilter,
      mongoFilter,
      vaultLimit,
    );
    chunks = [...pinnedChunks, ...vaultChunks];
  }

  // batch section inflation — single MongoDB query
  const sectionIds = chunks
    .map((c) => c.sectionId)
    .filter((id): id is string => Boolean(id));

  if (sectionIds.length > 0) {
    const sections = await SectionContent.find({ sectionId: { $in: sectionIds } }).lean();
    const sectionMap = new Map(sections.map((s) => [s.sectionId, s.content]));
    for (const chunk of chunks) {
      if (!chunk.sectionId) continue;
      const full = sectionMap.get(chunk.sectionId);
      if (full && full.length > chunk.text.length) chunk.text = full;
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

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
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
