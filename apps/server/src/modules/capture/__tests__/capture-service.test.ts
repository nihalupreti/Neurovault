// apps/server/src/modules/capture/__tests__/capture-service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindByIdAndUpdate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindByIdAndUpdate: vi.fn(),
}));

vi.mock("../../files/fileMetadata.model.js", () => ({
  default: {
    create: mockCreate,
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

vi.mock("../../files/file-events.js", () => ({
  emitFileUploaded: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { captureContent } from "../capture-service.js";
import { emitFileUploaded } from "../../files/file-events.js";

describe("captureContent", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindByIdAndUpdate.mockReset();
    vi.mocked(emitFileUploaded).mockReset();
  });

  it("stores raw text immediately and emits fileUploaded", async () => {
    const fakeId = { toString: () => "abc123" };
    mockCreate.mockResolvedValue({
      _id: fakeId,
      serverPath: "D:/Neurovault/uploads/capture-123.md",
    });

    const result = await captureContent({
      content: "A quick thought about neural networks",
    });

    expect(result.fileId).toBe("abc123");
    expect(result.status).toBe("complete");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining(".md"),
        type: "file",
      })
    );
  });

  it("detects URL input and returns processing status", async () => {
    const fakeId = { toString: () => "def456" };
    mockCreate.mockResolvedValue({
      _id: fakeId,
      serverPath: "D:/Neurovault/uploads/capture-456.md",
    });

    const result = await captureContent({
      content: "https://example.com/article",
    });

    expect(result.fileId).toBe("def456");
    expect(result.status).toBe("processing");
  });

  it("includes optional note as annotation in raw text", async () => {
    const fakeId = { toString: () => "ghi789" };
    mockCreate.mockResolvedValue({
      _id: fakeId,
      serverPath: "D:/Neurovault/uploads/capture-789.md",
    });

    await captureContent({
      content: "Some thought",
      note: "This relates to my ML project",
    });

    const { writeFile } = await import("fs/promises");
    const writeCall = vi.mocked(writeFile).mock.calls[0];
    const written = writeCall?.[1] as string;
    expect(written).toContain("This relates to my ML project");
  });

  it("uses folderId when provided", async () => {
    const fakeId = { toString: () => "jkl012" };
    mockCreate.mockResolvedValue({
      _id: fakeId,
      serverPath: "D:/Neurovault/uploads/capture-012.md",
    });

    await captureContent({
      content: "A note",
      folderId: "folder123",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: "folder123",
      })
    );
  });
});
