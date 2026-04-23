"use client";

export default function BooksError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="nv-empty-hero">
      <div className="nv-empty-hero-inner">
        <div className="nv-error-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h3>Something went wrong</h3>
        <p>{error.message}</p>
        <div className="nv-empty-hero-actions">
          <button className="nv-empty-hero-btn is-secondary" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
