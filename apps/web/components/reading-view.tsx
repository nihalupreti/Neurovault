"use client";

import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getFile } from "@/api/client";
import { Icon } from "./icons";
import { useHighlight } from "@/contexts/HighlightContext";

interface ReadingViewProps {
  fileId: string | null;
  fileName: string;
  folderName: string;
}

export function ReadingView({ fileId, fileName, folderName }: ReadingViewProps) {
  const { highlightText, currentFileId } = useHighlight();

  const { data: content, isLoading } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => getFile(fileId!),
    enabled: !!fileId,
  });

  if (!fileId) {
    return (
      <main className="nv-reading">
        <div className="nv-reading-frame">
          <div style={{ textAlign: "center", padding: "120px 0", color: "var(--ink-faint)" }}>
            Select a file from the vault
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="nv-reading">
        <div className="nv-reading-frame">
          <div style={{ color: "var(--ink-faint)", padding: "60px 0" }}>Loading&hellip;</div>
        </div>
      </main>
    );
  }

  const shouldHighlight = currentFileId === fileId && highlightText;

  return (
    <main className="nv-reading">
      <div className="nv-reading-frame">
        <div className="nv-doc-breadcrumb">
          <span>{folderName}</span>
          <span className="nv-bc-sep">/</span>
          <span>{fileName}</span>
        </div>

        <article className="nv-doc">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="nv-h1">{children}</h1>,
              h2: ({ children }) => <h2 className="nv-h2">{children}</h2>,
              h3: ({ children }) => <h3 className="nv-h3">{children}</h3>,
              p: ({ children }) => {
                const text = String(children);
                const isHighlighted =
                  shouldHighlight &&
                  text.toLowerCase().includes(highlightText!.toLowerCase().slice(0, 40));
                return (
                  <p className={isHighlighted ? "nv-blk-highlight" : undefined}>
                    {children}
                  </p>
                );
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
              code: ({ children, className }) => {
                if (className) {
                  return <code>{children}</code>;
                }
                return (
                  <code style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9em",
                    background: "var(--bg-1)",
                    padding: "1px 4px",
                    borderRadius: "3px",
                  }}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content ?? ""}
          </ReactMarkdown>
        </article>

        <div className="nv-doc-foot">
          <div className="nv-doc-foot-stats">
            <span><Icon name="clock" size={11} /> updated recently</span>
            <span>&middot;</span>
            <span>{content ? content.split(/\s+/).length.toLocaleString() : 0} words</span>
          </div>
        </div>
      </div>
    </main>
  );
}
