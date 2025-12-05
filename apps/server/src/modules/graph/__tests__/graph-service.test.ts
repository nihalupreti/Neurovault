import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRun, mockClose } = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockClose: vi.fn(),
}));

vi.mock("@neurovault/config", () => ({
  getNeo4jDriver: vi.fn().mockReturnValue({
    session: vi.fn().mockReturnValue({
      run: mockRun,
      close: mockClose,
    }),
  }),
}));

import {
  upsertFileNode,
  removeFileNode,
  syncWikilinks,
  upsertSimilarEdges,
} from "../graph-service.js";

describe("graph-service CRUD", () => {
  beforeEach(() => {
    mockRun.mockReset();
    mockClose.mockReset();
    mockRun.mockResolvedValue({ records: [] });
  });

  it("upsertFileNode runs MERGE query with correct params", async () => {
    await upsertFileNode("f1", "notes.md", "vault/notes.md");
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (f:File {fileId: $fileId})"),
      { fileId: "f1", fileName: "notes.md", path: "vault/notes.md" }
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("removeFileNode runs DETACH DELETE", async () => {
    await removeFileNode("f1");
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("DETACH DELETE"),
      { fileId: "f1" }
    );
  });

  it("syncWikilinks deletes old LINKS_TO and creates new ones", async () => {
    await syncWikilinks("f1", [
      { targetFileId: "f2", anchor: "Newton's Laws" },
      { targetFileId: "f3", anchor: "Calculus" },
    ]);
    const calls = mockRun.mock.calls;
    const deleteCall = calls.find(([q]: [string]) => q.includes("DELETE r"));
    expect(deleteCall).toBeTruthy();
    const createCall = calls.find(([q]: [string]) => q.includes("LINKS_TO"));
    expect(createCall).toBeTruthy();
  });

  it("upsertSimilarEdges replaces old SIMILAR edges", async () => {
    await upsertSimilarEdges("f1", [
      {
        targetFileId: "f2",
        score: 0.85,
        chunkPairs: [{ sourceIdx: 0, targetIdx: 2, score: 0.85 }],
      },
    ]);
    const calls = mockRun.mock.calls;
    const deleteCall = calls.find(
      ([q]: [string]) => q.includes("SIMILAR") && q.includes("DELETE")
    );
    expect(deleteCall).toBeTruthy();
    const createCall = calls.find(
      ([q]: [string]) => q.includes("SIMILAR") && q.includes("CREATE")
    );
    expect(createCall).toBeTruthy();
  });
});
