"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { BookLibrary } from "@/components/book/book-library";
import { useMobile } from "@/hooks/useMobile";
import { importBook } from "@/api/client";
import type { BookSummary } from "@/api/client";

interface BooksPageClientProps {
  initialBooks: BookSummary[];
}

export function BooksPageClient({ initialBooks }: BooksPageClientProps) {
  const router = useRouter();
  const mobile = useMobile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const importMutation = useMutation({
    mutationFn: importBook,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      router.push(`/books/${result.bookId}/read`);
    },
  });

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      importMutation.mutate(file);
      e.target.value = "";
    },
    [importMutation]
  );

  const handleSelectBook = useCallback(
    (bookId: string) => {
      router.push(`/books/${bookId}/read`);
    },
    [router]
  );

  return (
    <>
      <Header
        onSearchOpen={() => {}}
        onChatToggle={() => setChatOpen((p) => !p)}
        chatOpen={chatOpen}
        onMenu={() => {}}
        mobile={mobile}
      />

      <div className="nv-books-page">
        {importMutation.isPending && (
          <div className="nv-import-banner">Importing book&hellip;</div>
        )}

        <BookLibrary
          onSelectBook={handleSelectBook}
          onImport={handleImport}
          initialData={initialBooks}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleFileChange}
        hidden
      />
    </>
  );
}
