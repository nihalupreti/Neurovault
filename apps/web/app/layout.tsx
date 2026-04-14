import "./globals.css";

import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Neurovault — a second brain",
    template: "%s | Neurovault",
  },
  description: "Personal knowledge engine with hybrid search, RAG Q&A, and knowledge graph",
  openGraph: {
    title: "Neurovault — a second brain",
    description: "Personal knowledge engine with hybrid search, RAG Q&A, and knowledge graph",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
