"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-0)",
        color: "var(--ink-soft)",
        fontFamily: "inherit",
        gap: "1rem",
        padding: "2rem",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", fontWeight: 500, color: "var(--ink-soft)" }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: "0.5rem",
          padding: "0.5rem 1.25rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--bg-0)",
          backgroundColor: "var(--accent)",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
