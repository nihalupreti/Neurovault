"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getFile } from "@/api/client";
import { Icon } from "./icons";
import { useHighlight } from "@/contexts/HighlightContext";

const HIGHLIGHT_MATCH_LENGTH = 40;

function getFirstHeading(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)/m);
  return match?.[1] ? match[1].replace(/[*_`[\]]/g, "") : "Untitled";
}

function getReadingTime(wordCount: number): string {
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

function toHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
}

interface ReadingViewProps {
  fileId: string | null;
  fileName: string;
  folderName: string;
}

export function ReadingView({ fileId, fileName, folderName }: ReadingViewProps) {
  const { highlightText, currentFileId } = useHighlight();

  useEffect(() => {
    if (!highlightText || currentFileId !== fileId) return;
    const el = document.querySelector(".nv-blk-highlight");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightText, currentFileId, fileId]);

  const {
    data: content,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => getFile(fileId!),
    enabled: !!fileId,
  });

  if (!fileId) {
    return (
      <main className="nv-reading">
        <div className="nv-reading-frame">
          <div className="nv-empty-hero">
            <div className="nv-empty-hero-inner">
              <div className="nv-empty-hero-icon">
                <Icon name="file" size={24} />
              </div>
              <h3>No file selected</h3>
              <p>
                Choose a note from the sidebar, or use <kbd>⌘K</kbd> to search your vault.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="nv-reading">
        <div className="nv-reading-frame">
          <div className="nv-empty-hero">
            <div className="nv-empty-hero-inner">
              <div className="nv-spinner" />
              <p style={{ marginBottom: 0 }}>Loading file…</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="nv-reading">
        <div className="nv-reading-frame">
          <div className="nv-empty-hero">
            <div className="nv-empty-hero-inner">
              <div className="nv-error-icon">
                <Icon name="x" size={20} />
              </div>
              <h3>Something went wrong</h3>
              <p style={{ marginBottom: 0 }}>Failed to load this file</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const shouldHighlight = currentFileId === fileId && highlightText;
  const wordCount = content ? content.split(/\s+/).length : 0;

  return (
    <main className="nv-reading">
      <div className="nv-reading-frame">
        <div className="nv-doc-breadcrumb">
          <Icon name="folder" size={11} />
          <span>vault</span>
          <span className="nv-bc-sep">/</span>
          <span>{content ? getFirstHeading(content) : "Untitled"}</span>
        </div>

        <article className="nv-doc" role="article">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 id={toHeadingId(String(children))} className="nv-h1">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 id={toHeadingId(String(children))} className="nv-h2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 id={toHeadingId(String(children))} className="nv-h3">
                  {children}
                </h3>
              ),
              p: ({ children }) => {
                const text = String(children);
                const isHighlighted =
                  shouldHighlight &&
                  text
                    .toLowerCase()
                    .includes(highlightText!.toLowerCase().slice(0, HIGHLIGHT_MATCH_LENGTH));
                return <p className={isHighlighted ? "nv-blk-highlight" : undefined}>{children}</p>;
              },
              pre: ({ children }) => <pre className="nv-math">{children}</pre>,
              blockquote: ({ children }) => (
                <aside className="nv-callout">
                  <div className="nv-callout-bar" />
                  <div className="nv-callout-body">{children}</div>
                </aside>
              ),
              a: ({ href, children }) => (
                <a className="nv-wikilink" href={href ?? "#"}>
                  {children}
                </a>
              ),
              code: ({ children, className }) => (
                <code className={className ?? "nv-inline-code"}>{children}</code>
              ),
            }}
          >
            {content ?? ""}
          </ReactMarkdown>
        </article>

        <div className="nv-doc-foot">
          <div className="nv-doc-foot-stats">
            <span>
              <Icon name="clock" size={11} /> updated recently
            </span>
            <span>&middot;</span>
            <span>{wordCount.toLocaleString()} words</span>
            <span>&middot;</span>
            <span>{getReadingTime(wordCount)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
