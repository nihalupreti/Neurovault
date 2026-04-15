"use client";

export default function BookError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16, color: "var(--ink-soft)" }}>
      <h2 style={{ fontFamily: "var(--sans)", fontSize: 20, fontWeight: 400 }}>Failed to load book</h2>
      <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)" }}>{error.message}</p>
      <button onClick={reset} style={{ padding: "8px 16px", background: "var(--bg-2)", border: "1px solid var(--rule)", borderRadius: 6, color: "var(--ink-soft)", fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer" }}>
        Try again
      </button>
    </div>
  );
}
