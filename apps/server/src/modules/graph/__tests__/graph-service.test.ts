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
      executeWrite: vi.fn().mockImplementation(async (fn: any) => {
        await fn({ run: mockRun });
      }),
    }),
  }),
}));

import {
  upsertFileNode,
  removeFileNode,
  syncWikilinks,
  upsertFolderNode,
  syncHierarchy,
  getNeighbors,
  getFullGraph,
  getShortestPath,
  getStats,
} from "../graph.service.js";

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
    const deleteCall = calls.find((args: string[]) => args[0]?.includes("DELETE r"));
    expect(deleteCall).toBeTruthy();
    const createCall = calls.find((args: string[]) => args[0]?.includes("LINKS_TO"));
    expect(createCall).toBeTruthy();
  });

  it("upsertFolderNode runs MERGE on Folder", async () => {
    await upsertFolderNode("d1", "projects", "vault/projects");
    expect(mockRun).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (d:Folder {folderId: $folderId})"),
      { folderId: "d1", name: "projects", path: "vault/projects" }
    );
  });

  it("syncHierarchy creates CHILD_OF edge for File", async () => {
    await syncHierarchy("f1", "File", "d1");
    const calls = mockRun.mock.calls;
    const deleteCall = calls.find((args: string[]) => args[0]?.includes("CHILD_OF") && args[0]?.includes("DELETE"));
    expect(deleteCall).toBeTruthy();
    const createCall = calls.find((args: string[]) => args[0]?.includes("CHILD_OF") && args[0]?.includes("CREATE"));
    expect(createCall).toBeTruthy();
  });
});

describe("graph-service queries", () => {
  beforeEach(() => {
    mockRun.mockReset();
    mockClose.mockReset();
  });

  it("getNeighbors returns outgoing, backlinks, and hierarchy", async () => {
    mockRun
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "t")
                return { properties: { fileId: "f2", fileName: "b.md", path: "b.md" } };
              if (key === "r")
                return { properties: { anchor: "link text" } };
              return null;
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "t")
                return { properties: { fileId: "f3", fileName: "c.md", path: "c.md" } };
              if (key === "r")
                return { properties: { anchor: "backlink" } };
              return null;
            },
          },
        ],
      })
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ records: [] });

    const result = await getNeighbors("f1");
    expect(result.outgoing).toHaveLength(1);
    expect(result.outgoing[0]!.fileId).toBe("f2");
    expect(result.backlinks).toHaveLength(1);
    expect(result.backlinks[0]!.fileId).toBe("f3");
    expect(result.hierarchy.parent).toBeNull();
    expect(result.hierarchy.siblings).toHaveLength(0);
  });

  it("getFullGraph returns nodes, folders, and edges", async () => {
    mockRun
      .mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: { fileId: "f1", fileName: "a.md", path: "a.md", clusterId: { low: 0 } },
            }),
          },
        ],
      })
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const map: Record<string, string> = { srcId: "f1", tgtId: "f2", anchor: "link" };
              return map[key];
            },
          },
        ],
      })
      .mockResolvedValueOnce({ records: [] });

    const result = await getFullGraph();
    expect(result.nodes).toHaveLength(1);
    expect(result.folders).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
  });

  it("getShortestPath returns empty when no path", async () => {
    mockRun.mockResolvedValueOnce({ records: [] });
    const result = await getShortestPath("f1", "f99");
    expect(result.path).toEqual([]);
    expect(result.length).toBe(-1);
  });

  it("getStats returns graph metrics including folderCount", async () => {
    mockRun
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              const map: Record<string, any> = {
                nodeCount: { low: 10 },
                folderCount: { low: 3 },
                edgeCount: { low: 25 },
                avgDegree: 5.0,
              };
              return map[key];
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "f")
                return { properties: { fileId: "f1", fileName: "a.md", path: "a.md" } };
              if (key === "degree") return { low: 8 };
              return null;
            },
          },
        ],
      });
    const result = await getStats();
    expect(result.nodeCount).toBe(10);
    expect(result.folderCount).toBe(3);
    expect(result.edgeCount).toBe(25);
    expect(result.topConnected).toHaveLength(1);
  });
});
