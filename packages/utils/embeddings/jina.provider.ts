import type { EmbeddingProvider, EmbeddingTask } from "./types.js";

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const MODEL = "jina-embeddings-v3";

const TASK_MAP: Record<EmbeddingTask, string> = {
  query: "retrieval.query",
  document: "retrieval.passage",
};

export class JinaProvider implements EmbeddingProvider {
  readonly dimensions = 1024;

  async embed(text: string, task: EmbeddingTask): Promise<number[]> {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        task: TASK_MAP[task],
        normalized: true,
        input: [text],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jina API error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
    const embedding = json.data[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error("Jina API returned empty embedding");
    }

    return embedding;
  }

  async embedBatch(
    texts: string[],
    task: EmbeddingTask,
    lateChunking: boolean,
  ): Promise<number[][]> {
    const response = await fetch(JINA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        task: TASK_MAP[task],
        normalized: true,
        late_chunking: lateChunking,
        input: texts,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jina API error ${response.status}: ${body}`);
    }

    const json = (await response.json()) as { data: Array<{ embedding: number[] }> };

    if (!json.data || json.data.length === 0) {
      throw new Error("Jina API returned empty embeddings");
    }

    return json.data.map((d) => d.embedding);
  }
}
