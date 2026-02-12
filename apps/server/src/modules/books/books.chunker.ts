import { getQdrantClient } from "@neurovault/config";
import ChunkText from "../search/search.chunk-text.model.js";
import SectionContent from "../chunker/chunker.section.model.js";
import { processContent } from "../chunker/chunker.pipeline.js";
import { PlainTextParser } from "../chunker/parsers/plain-text.parser.js";

const COLLECTION = "neurovault";
const plainTextParser = new PlainTextParser();

interface ChunkInput {
  bookId: string;
  bookTitle: string;
  chapters: {
    number: number;
    plainText: string;
    sections: { anchor: string; title: string; level: number }[];
  }[];
}

export async function chunkAndEmbedBook(input: ChunkInput): Promise<number> {
  const client = getQdrantClient();

  await client.delete(COLLECTION, {
    filter: { must: [{ key: "bookId", match: { value: input.bookId } }] },
  });
  await ChunkText.deleteMany({ bookId: input.bookId });
  await SectionContent.deleteMany({ fileId: input.bookId });

  let totalChunks = 0;

  for (const chapter of input.chapters) {
    if (!chapter.plainText.trim()) continue;

    const firstSection = chapter.sections[0]?.anchor || "";
    const metadata: Record<string, string> = {
      source: "book",
      bookId: input.bookId,
      bookTitle: input.bookTitle,
      chapterNumber: String(chapter.number),
      sectionAnchor: firstSection,
    };

    const count = await processContent(
      chapter.plainText,
      input.bookId,
      plainTextParser,
      metadata
    );
    totalChunks += count;
  }

  return totalChunks;
}
