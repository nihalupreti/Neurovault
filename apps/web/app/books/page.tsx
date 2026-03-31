import { serverFetch } from "@/api/server-fetch";
import type { BookSummary } from "@/api/client";
import { BooksPageClient } from "./books-client";

export default async function BooksPage() {
  let initialBooks: BookSummary[] = [];
  try {
    initialBooks = await serverFetch<BookSummary[]>("/api/books");
  } catch {
    // Client-side will re-fetch if server fetch fails
  }

  return <BooksPageClient initialBooks={initialBooks} />;
}
