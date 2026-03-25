"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { BookLibrary } from "@/components/book/book-library";
import { useMobile } from "@/hooks/useMobile";
import { importBook } from "@/api/client";

export default function BooksPage() {
  return (
    <Suspense>
      <BooksContent />
    </Suspense>
  );
}

function BooksContent() {
  const router = useRouter();
  const mobile = useMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const importMutation = useMutation({
    mutationFn: importBook,
    onSuccess: (result) => {
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
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.epub,.pdf"
        onChange={handleFileChange}
        hidden
      />
    </>
  );
}
