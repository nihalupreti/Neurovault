import { getQdrantClient } from "@neurovault/config";
import { getEmbeddings } from "@neurovault/utils/embeddings";
import { BookAnnotation, ReadingProgress } from "./reader.model.js";

const COLLECTION = "neurovault";

interface CreateAnnotationInput {
  bookId: string;
  chapterNumber: number;
  sectionAnchor: string;
  type: "highlight" | "note" | "vault-link";
  textRange: { startOffset: number; endOffset: number };
  highlightedText: string;
  color?: string;
  noteContent?: string;
  linkedNoteId?: string;
}

export async function createAnnotation(input: CreateAnnotationInput) {
  const annotation = await BookAnnotation.create(input);

  const textToEmbed =
    input.type === "note" && input.noteContent
      ? `${input.highlightedText} — ${input.noteContent}`
      : input.highlightedText;

  const embedding = await getEmbeddings(textToEmbed);
  const client = getQdrantClient();

  await client.upsert(COLLECTION, {
    wait: true,
    points: [
      {
        id: Date.now(),
        vector: embedding,
        payload: {
          text: textToEmbed,
          fileId: input.bookId,
          chunk_index: 0,
          source: "annotation",
          type: input.type,
          bookId: input.bookId,
          chapterNumber: input.chapterNumber,
          sectionAnchor: input.sectionAnchor,
          annotationId: annotation._id.toString(),
        },
      },
    ],
  });

  if (input.type === "vault-link" && input.linkedNoteId) {
    const { getNeo4jDriver } = await import("@neurovault/config");
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      const sectionId = `${input.bookId}:${input.sectionAnchor}`;
      await session.executeWrite(async (tx: any) => {
        await tx.run(
          `MATCH (s:BookSection {sectionId: $sectionId})
           MATCH (f:File {fileId: $fileId})
           MERGE (s)-[:LINKED_BY_USER]->(f)
           MERGE (f)-[:REFERENCED_IN]->(s)`,
          { sectionId, fileId: input.linkedNoteId },
        );
      });
    } finally {
      await session.close();
    }
  }

  return annotation;
}

export async function listAnnotations(
  bookId: string,
  chapterNumber?: number,
  type?: string,
) {
  const filter: Record<string, unknown> = { bookId };
  if (chapterNumber !== undefined) filter.chapterNumber = chapterNumber;
  if (type) filter.type = type;
  return BookAnnotation.find(filter).sort({ createdAt: 1 }).lean();
}

export async function updateAnnotation(
  id: string,
  updates: Partial<CreateAnnotationInput>,
) {
  return BookAnnotation.findByIdAndUpdate(id, updates, { new: true }).lean();
}

export async function deleteAnnotation(id: string) {
  const annotation = await BookAnnotation.findByIdAndDelete(id).lean();
  if (annotation) {
    const client = getQdrantClient();
    await client.delete(COLLECTION, {
      filter: { must: [{ key: "annotationId", match: { value: id } }] },
    });
  }
  return annotation;
}

export async function getProgress(bookId: string) {
  const progress = await ReadingProgress.findOne({ bookId }).lean();
  return (
    progress || {
      bookId,
      currentChapter: 1,
      scrollPosition: 0,
      chaptersCompleted: [],
      timeSpentMinutes: {},
      lastReadAt: new Date(),
    }
  );
}

export async function updateProgress(
  bookId: string,
  data: {
    currentChapter?: number;
    scrollPosition?: number;
    chaptersCompleted?: number[];
    timeSpentMinutes?: Record<string, number>;
  },
) {
  const update: Record<string, unknown> = { lastReadAt: new Date() };
  if (data.currentChapter !== undefined)
    update.currentChapter = data.currentChapter;
  if (data.scrollPosition !== undefined)
    update.scrollPosition = data.scrollPosition;
  if (data.chaptersCompleted) update.chaptersCompleted = data.chaptersCompleted;
  if (data.timeSpentMinutes) {
    for (const [k, v] of Object.entries(data.timeSpentMinutes)) {
      update[`timeSpentMinutes.${k}`] = v;
    }
  }

  return ReadingProgress.findOneAndUpdate(
    { bookId },
    { $set: update },
    { upsert: true, new: true },
  ).lean();
}
