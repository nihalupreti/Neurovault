import EPub from "epub";
import * as cheerio from "cheerio";
import { sanitizeHtml } from "./books.sanitizer.js";
import { scopeCss } from "./books.css-scoper.js";
import type { ParsedSection } from "./books.parser.js";

export interface EpubMetadata {
  title: string;
  author: string;
  publisher: string;
  description: string;
  language: string;
  publishedDate: string;
}

export interface EpubChapter {
  number: number;
  title: string;
  htmlContent: string;
  plainText: string;
  scopedCss: string;
  sections: ParsedSection[];
}

export interface EpubAsset {
  filename: string;
  data: Buffer;
  mimeType: string;
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  chapters: EpubChapter[];
  assets: {
    coverFilename: string | null;
    images: EpubAsset[];
    fonts: EpubAsset[];
  };
}

export async function parseEpub(filePath: string, bookId: string): Promise<ParsedEpub> {
  const epub = new EPub(filePath);
  await epub.parse();

  const metadata = extractMetadata(epub);
  const assetBasePath = `/api/books/${bookId}/assets`;

  const cssCache = new Map<string, string>();
  const images: EpubAsset[] = [];
  const fonts: EpubAsset[] = [];
  let coverFilename: string | null = null;

  const coverMeta = epub.metadata.cover as string | undefined;
  if (coverMeta && epub.manifest[coverMeta]) {
    coverFilename = epub.manifest[coverMeta].href;
  }

  for (const item of Object.values(epub.manifest)) {
    const mediaType = item["media-type"] ?? "";
    if (mediaType.startsWith("image/")) {
      const result = await epub.getFile(item.id).catch(() => null);
      if (result) {
        images.push({ filename: item.href, data: result.data, mimeType: mediaType });
      }
    } else if (mediaType.includes("font") || /\.(woff2?|ttf|otf|eot)$/i.test(item.href)) {
      const result = await epub.getFile(item.id).catch(() => null);
      if (result) {
        fonts.push({ filename: item.href, data: result.data, mimeType: mediaType });
      }
    } else if (mediaType === "text/css") {
      const result = await epub.getFile(item.id).catch(() => null);
      if (result) {
        const raw = result.data.toString("utf-8");
        const scoped = scopeCss(raw, assetBasePath);
        cssCache.set(item.href, scoped);
      }
    }
  }

  const chapters: EpubChapter[] = [];

  for (let i = 0; i < epub.flow.length; i++) {
    const spineItem = epub.flow[i]!;
    const rawHtml = await epub.getChapterRaw(spineItem.id).catch(() => null);
    if (!rawHtml) continue;

    const $ = cheerio.load(rawHtml, { xmlMode: true });

    const linkedCss: string[] = [];
    $("link[rel='stylesheet']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const normalizedHref = href.replace(/^\.\.\//, "").replace(/^\.\//, "");
        for (const [key, val] of cssCache.entries()) {
          if (key.endsWith(normalizedHref) || normalizedHref.endsWith(key)) {
            linkedCss.push(val);
            break;
          }
        }
      }
    });

    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("http") && !src.startsWith("data:")) {
        const cleaned = src.replace(/^\.\.\//, "").replace(/^\.\//, "");
        $(el).attr("src", `${assetBasePath}/${cleaned}`);
      }
    });

    const bodyHtml = $("body").html() ?? "";
    const sanitized = sanitizeHtml(bodyHtml);

    const sections: ParsedSection[] = [];
    let chapterTitle = "";
    const $body = cheerio.load(sanitized);

    $body("h1[id], h2[id], h3[id], h4[id]").each((_, heading) => {
      const h = $body(heading);
      const level = parseInt(heading.tagName.replace("h", ""), 10);
      const anchor = h.attr("id") ?? "";
      const text = h.text().trim();
      sections.push({ anchor, title: text, level });
      if (level === 1 && !chapterTitle) chapterTitle = text;
    });

    const plainText = $body.root().text().replace(/\s+/g, " ").trim();

    chapters.push({
      number: i + 1,
      title: chapterTitle || `Chapter ${i + 1}`,
      htmlContent: sanitized,
      plainText,
      scopedCss: linkedCss.join("\n"),
      sections,
    });
  }

  return {
    metadata,
    chapters,
    assets: { coverFilename, images, fonts },
  };
}

function extractMetadata(epub: EPub): EpubMetadata {
  return {
    title: epub.metadata.title || "Untitled",
    author: epub.metadata.creator || "",
    publisher: epub.metadata.publisher ?? "",
    description: epub.metadata.description || "",
    language: epub.metadata.language || "",
    publishedDate: epub.metadata.date || "",
  };
}
