"use client";

import { Icon } from "@/components/icons";

export default function GraphError({ reset }: { reset: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-0)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "var(--ink-faint)", marginBottom: 12 }}>
          <Icon name="x" size={24} />
        </div>
        <h3 style={{ color: "var(--ink)", margin: "0 0 8px", fontSize: 16 }}>
          Failed to load graph
        </h3>
        <button
          onClick={reset}
          style={{
            padding: "6px 16px",
            background: "var(--bg-2)",
            border: "1px solid var(--rule)",
            borderRadius: 6,
            color: "var(--ink-soft)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
