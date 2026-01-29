"use client";

import { useQuery } from "@tanstack/react-query";
import { getRelatedContent, type RelatedContent } from "@/api/client";

interface BookConnectionsProps {
  bookId: string;
  sectionAnchor: string;
}

export function BookConnections({ bookId, sectionAnchor }: BookConnectionsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["relatedContent", bookId, sectionAnchor],
    queryFn: () => getRelatedContent(bookId, sectionAnchor),
    enabled: !!bookId && !!sectionAnchor,
  });

  const results = data?.results ?? [];
  const vaultItems = results.filter((r) => !r.bookId);
  const bookItems = results.filter((r) => !!r.bookId);

  if (isLoading) {
    return <div className="nv-pane-eyebrow"><span>loading connections...</span></div>;
  }

  return (
    <>
      <div className="nv-pane-eyebrow">
        <span>related in your vault</span>
        <span>{vaultItems.length}</span>
      </div>
      <ul className="nv-cite-list">
        {vaultItems.map((r, i) => (
          <VaultCite key={`vault-${i}`} item={r} />
        ))}
      </ul>

      <div className="nv-pane-eyebrow nv-pane-eyebrow-spaced">
        <span>across your library</span>
        <span>{bookItems.length}</span>
      </div>
      <ul className="nv-cite-list">
        {bookItems.map((r, i) => (
          <BookCite key={`book-${i}`} item={r} />
        ))}
      </ul>
    </>
  );
}

function VaultCite({ item }: { item: RelatedContent }) {
  return (
    <li className="is-vault">
      <div className="nv-cite-kind">
        <b>note</b>
        <span>&middot;</span>
        <span>cosine</span>
      </div>
      <div className="nv-cite-head">
        <span className="nv-cite-file">{item.fileId}</span>
        <span className="nv-cite-score">
          {(item.score * 100).toFixed(0)}
          <small>%</small>
        </span>
      </div>
      <p className="nv-cite-excerpt">{item.snippet}</p>
    </li>
  );
}

function BookCite({ item }: { item: RelatedContent }) {
  return (
    <li className="is-book">
      <div className="nv-cite-kind">
        <b>{item.bookTitle}</b>
        <span>&middot;</span>
        <span>ch. {item.chapterNumber}</span>
      </div>
      <div className="nv-cite-head">
        <span className="nv-cite-file">{item.sectionAnchor ?? `ch. ${item.chapterNumber}`}</span>
        <span className="nv-cite-score">
          {(item.score * 100).toFixed(0)}
          <small>%</small>
        </span>
      </div>
      <p className="nv-cite-excerpt">{item.snippet}</p>
    </li>
  );
}
