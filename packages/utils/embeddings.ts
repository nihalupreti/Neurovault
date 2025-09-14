export const getEmbeddings = async (text: string) => {
  const res = await fetch("http://127.0.0.1:8000/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  const vector: number[] = data.embedding;
  return vector;
};
