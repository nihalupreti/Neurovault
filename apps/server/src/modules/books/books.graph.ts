import { getNeo4jDriver } from "@neurovault/config";
import { getQdrantClient } from "@neurovault/config";

const COLLECTION = "neurovault";

export async function createBookGraphNodes(
  bookId: string,
  title: string,
  topic: string,
  chapters: { number: number; title: string; sections: { anchor: string; title: string }[] }[],
): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MERGE (b:Book {bookId: $bookId}) SET b.title = $title, b.topic = $topic`,
        { bookId, title, topic },
      );

      for (const ch of chapters) {
        const chId = `${bookId}:ch${ch.number}`;
        await tx.run(
          `MERGE (c:BookChapter {chapterId: $chId})
           SET c.bookId = $bookId, c.number = $number, c.title = $title
           WITH c
           MATCH (b:Book {bookId: $bookId})
           MERGE (b)-[:HAS_CHAPTER]->(c)`,
          { chId, bookId, number: ch.number, title: ch.title },
        );

        for (const sec of ch.sections) {
          const secId = `${bookId}:${sec.anchor}`;
          await tx.run(
            `MERGE (s:BookSection {sectionId: $secId})
             SET s.bookId = $bookId, s.chapterNumber = $chapterNumber, s.anchor = $anchor, s.title = $title
             WITH s
             MATCH (c:BookChapter {chapterId: $chId})
             MERGE (c)-[:HAS_SECTION]->(s)`,
            { secId, bookId, chapterNumber: ch.number, anchor: sec.anchor, title: sec.title, chId },
          );
        }
      }
    });
  } finally {
    await session.close();
  }
}

export async function deleteBookGraphNodes(bookId: string): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(
        `MATCH (b:Book {bookId: $bookId})
         OPTIONAL MATCH (b)-[:HAS_CHAPTER]->(c:BookChapter)
         OPTIONAL MATCH (c)-[:HAS_SECTION]->(s:BookSection)
         DETACH DELETE s, c, b`,
        { bookId },
      );
    });
  } finally {
    await session.close();
  }
}

export async function runBookSimilarityJob(
  bookId: string,
  threshold = parseFloat(process.env.GRAPH_SIMILARITY_THRESHOLD || "0.7"),
  maxPerSection = parseInt(process.env.GRAPH_MAX_SIMILAR_PER_FILE || "5", 10),
): Promise<number> {
  const client = getQdrantClient();
  const driver = getNeo4jDriver();

  const scrollResult = await client.scroll(COLLECTION, {
    filter: { must: [{ key: "bookId", match: { value: bookId } }] },
    with_vector: true,
    with_payload: true,
    limit: 500,
  });

  const bookChunks = scrollResult.points || [];
  if (bookChunks.length === 0) return 0;

  let edgesCreated = 0;
  const session = driver.session();

  try {
    for (const chunk of bookChunks) {
      const vector = chunk.vector as number[];
      const sectionAnchor = (chunk.payload?.sectionAnchor as string) || "";
      const sectionId = `${bookId}:${sectionAnchor}`;

      const similar = await client.query(COLLECTION, {
        query: vector,
        limit: maxPerSection,
        filter: {
          must_not: [{ key: "bookId", match: { value: bookId } }],
        },
        with_payload: true,
      });

      for (const point of similar.points || []) {
        const score = point.score ?? 0;
        if (score < threshold) continue;

        const targetFileId = (point.payload?.fileId as string) || "";
        const targetSource = (point.payload?.source as string) || "note";

        if (targetSource === "book") {
          const targetBookId = (point.payload?.bookId as string) || "";
          const targetAnchor = (point.payload?.sectionAnchor as string) || "";
          const targetSectionId = `${targetBookId}:${targetAnchor}`;
          await session.executeWrite(async (tx) => {
            await tx.run(
              `MATCH (a:BookSection {sectionId: $srcId})
               MATCH (b:BookSection {sectionId: $tgtId})
               MERGE (a)-[r:SIMILAR]->(b) SET r.score = $score`,
              { srcId: sectionId, tgtId: targetSectionId, score },
            );
          });
        } else {
          await session.executeWrite(async (tx) => {
            await tx.run(
              `MATCH (s:BookSection {sectionId: $secId})
               MATCH (f:File {fileId: $fileId})
               MERGE (s)-[r:SIMILAR]->(f) SET r.score = $score`,
              { secId: sectionId, fileId: targetFileId, score },
            );
          });
        }
        edgesCreated++;
      }
    }
  } finally {
    await session.close();
  }

  return edgesCreated;
}
