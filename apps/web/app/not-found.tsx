import Link from "next/link";

export default function NotFound() {
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
      <h2 style={{ fontSize: "1.25rem", fontWeight: 500 }}>Page not found</h2>
      <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--accent)",
          textDecoration: "none",
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
