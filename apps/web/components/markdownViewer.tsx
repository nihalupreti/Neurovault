"use client";

import { useEffect, useRef } from "react";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  markdown: string;
  highlightText?: string | null;
}

export default function MarkdownViewer({
  markdown,
  highlightText,
}: MarkdownViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const HeadingRenderer = (props: any) => {
    const Tag = props.node.tagName;
    const id = props.children.toString().replace(/\s+/g, "-");
    return <Tag id={id} {...props} className="scroll-mt-32" />;
  };

  useEffect(() => {
    if (!highlightText || !contentRef.current) return;

    // Wait for markdown to render
    const timeoutId = setTimeout(() => {
      if (!contentRef.current) return;

      // Remove any existing highlights
      const existingHighlights = contentRef.current.querySelectorAll(
        ".search-highlight-wrapper"
      );
      existingHighlights.forEach((el) =>
        el.classList.remove("search-highlight-wrapper")
      );

      // Find the best matching element
      highlightMatchingSection(contentRef.current, highlightText);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [highlightText, markdown]);

  const highlightMatchingSection = (
    container: HTMLElement,
    searchText: string
  ) => {
    // Get all potential elements to highlight
    const allElements = container.querySelectorAll(
      "p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, div"
    );

    const normalizeText = (text: string) =>
      text.replace(/\s+/g, " ").trim().toLowerCase();

    const normalizedSearch = normalizeText(searchText);
    let bestMatch: { element: Element; score: number } | null = null;

    // Find the best matching element
    allElements.forEach((element) => {
      const elementText = normalizeText(element.textContent || "");

      // Check if this element contains a significant portion of the search text
      // Use first 100 characters for more accurate matching
      const searchPrefix = normalizedSearch.substring(0, 100);

      if (elementText.includes(searchPrefix)) {
        // Score based on how much of the search text is contained
        // Prefer shorter elements (more specific matches)
        const score = elementText.length;

        if (!bestMatch || score < bestMatch.score) {
          bestMatch = { element, score };
        }
      }
    });

    // If no exact match found, try fuzzy matching with first 30 characters
    if (!bestMatch) {
      const shortSearch = normalizedSearch.substring(0, 30);

      allElements.forEach((element) => {
        const elementText = normalizeText(element.textContent || "");

        if (elementText.includes(shortSearch)) {
          const score = elementText.length;

          if (!bestMatch || score < bestMatch.score) {
            bestMatch = { element, score };
          }
        }
      });
    }

    // Apply highlight and scroll
    if (bestMatch) {
      bestMatch.element.classList.add("search-highlight-wrapper");

      // Scroll to the highlighted element
      setTimeout(() => {
        bestMatch?.element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }
  };

  return (
    <>
      <div ref={contentRef}>
        <Markdown
          remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
          components={Object.fromEntries(
            [1, 2, 3, 4, 5, 6].map((l) => [`h${l}`, HeadingRenderer])
          )}
        >
          {markdown}
        </Markdown>
      </div>

      <style jsx global>{`
        .search-highlight-wrapper {
          background: linear-gradient(
            90deg,
            rgba(251, 191, 36, 0.15) 0%,
            rgba(251, 191, 36, 0.25) 50%,
            rgba(251, 191, 36, 0.15) 100%
          );
          padding: 1rem !important;
          border-radius: 0.5rem;
          border-left: 4px solid rgb(251, 191, 36);
          margin: 1rem 0 !important;
          animation: highlight-fade-in 0.6s ease-in-out;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
          transition: all 0.3s ease;
        }

        .search-highlight-wrapper:hover {
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.25);
        }

        @keyframes highlight-fade-in {
          0% {
            background-color: rgba(251, 191, 36, 0.5);
            transform: translateX(-8px);
            box-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
          }
          100% {
            background: linear-gradient(
              90deg,
              rgba(251, 191, 36, 0.15) 0%,
              rgba(251, 191, 36, 0.25) 50%,
              rgba(251, 191, 36, 0.15) 100%
            );
            transform: translateX(0);
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
          }
        }
      `}</style>
    </>
  );
}
