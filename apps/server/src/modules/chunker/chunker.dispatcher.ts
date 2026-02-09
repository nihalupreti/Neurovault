import path from "path";
import { promises as fs } from "fs";
import { processContent } from "./chunker.pipeline.js";
import { MarkdownParser } from "./parsers/markdown.parser.js";
import { HtmlParser } from "./parsers/html.parser.js";
import { PlainTextParser } from "./parsers/plain-text.parser.js";
import type { ContentParser } from "./parsers/parser.types.js";

const markdownParser = new MarkdownParser();
const htmlParser = new HtmlParser();
const plainTextParser = new PlainTextParser();

function getParser(ext: string): ContentParser {
  switch (ext) {
    case ".md":
      return markdownParser;
    case ".html":
    case ".htm":
      return htmlParser;
    default:
      return plainTextParser;
  }
}

export async function handleFileUpload(filePath: string, fileId: string) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parser = getParser(ext);
    const count = await processContent(content, fileId, parser);
    console.log(`Processed ${count} chunks from ${filePath}`);
  } catch (err) {
    console.error(`Error processing file "${filePath}":`, err);
  }
}

export async function processMarkdown(filePath: string, fileId: string) {
  return handleFileUpload(filePath, fileId);
}
