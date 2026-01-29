import { serverFetch } from "@/api/server-fetch";
import type { BookSummary, BookChapter } from "@/api/client";
import { ReaderClient } from "./reader-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookReaderPage({ params }: PageProps) {
  const { id } = await params;

  let initialBook: BookSummary | null = null;
  let initialChapter: BookChapter | null = null;

  try {
    initialBook = await serverFetch<BookSummary>(`/api/books/${id}`);
    initialChapter = await serverFetch<BookChapter>(`/api/books/${id}/chapters/1`);
  } catch {
    // Client will re-fetch if server fetch fails
  }

  return (
    <ReaderClient
      bookId={id}
      initialBook={initialBook}
      initialChapter={initialChapter}
    />
  );
}
