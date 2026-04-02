import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reading",
};

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
