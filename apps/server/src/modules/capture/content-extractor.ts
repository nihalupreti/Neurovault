import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export interface ArticleExtraction {
  title: string;
  content: string;
}

export interface MetaExtraction {
  title: string;
  description: string;
}

export function extractArticle(html: string): ArticleExtraction {
  const { document } = parseHTML(html);
  const reader = new Readability(document as any);
  const article = reader.parse();

  if (!article) {
    return { title: extractTitleFromHtml(html), content: "" };
  }

  return {
    title: article.title || extractTitleFromHtml(html),
    content: article.textContent?.trim() || "",
  };
}

export function extractMeta(html: string): MetaExtraction {
  const { document } = parseHTML(html);

  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  const titleTag = document.querySelector("title")?.textContent || "";

  return {
    title: ogTitle || titleTag,
    description: ogDesc || metaDesc,
  };
}

function extractTitleFromHtml(html: string): string {
  const { document } = parseHTML(html);
  return document.querySelector("title")?.textContent || "";
}
