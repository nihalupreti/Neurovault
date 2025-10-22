import { GoogleGenAI } from "@google/genai";




export async function getEmbeddings(text: string): Promise<number[]> {
  const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  return response.embeddings?.[0]?.values ?? [];
}

// export const getEmbeddings = async (text: string) => {
//   const res = await fetch("http://127.0.0.1:8000/embed", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ text }),
//   });
//   const data = await res.json();
//   const vector: number[] = data.embedding;
//   return vector;
// };
