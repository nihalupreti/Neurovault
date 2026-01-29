import * as cheerio from "cheerio";

export interface ParsedSection {
  anchor: string;
  title: string;
  level: number;
}

export interface ParsedChapter {
  number: number;
  title: string;
  htmlContent: string;
  plainText: string;
  sections: ParsedSection[];
}

export interface ParsedBook {
  title: string;
  topic: string;
  chapters: ParsedChapter[];
}

export function parseBookHtml(html: string): ParsedBook {
  const $ = cheerio.load(html);

  const title =
    $("#title-page .book-title").text().trim() ||
    $("title").text().trim() ||
    "Untitled";
  const topic = $("#title-page .book-subtitle").text().trim();

  const chapters: ParsedChapter[] = [];

  $("article[data-chapter]").each((_, el) => {
    const article = $(el);
    const num = parseInt(article.attr("data-chapter") || "0", 10);
    const htmlContent = article.html() || "";

    const sections: ParsedSection[] = [];
    let chapterTitle = "";

    article.find("h1[id], h2[id], h3[id], h4[id]").each((_, heading) => {
      const h = $(heading);
      const level = parseInt(heading.tagName.replace("h", ""), 10);
      const anchor = h.attr("id") || "";
      const text = h.text().trim();

      sections.push({ anchor, title: text, level });
      if (level === 1 && !chapterTitle) chapterTitle = text;
    });

    const plainText = article.text().replace(/\s+/g, " ").trim();

    chapters.push({
      number: num,
      title: chapterTitle || `Chapter ${num}`,
      htmlContent,
      plainText,
      sections,
    });
  });

  return { title, topic, chapters };
}
