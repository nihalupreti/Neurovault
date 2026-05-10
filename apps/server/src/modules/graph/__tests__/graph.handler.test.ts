import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQueueAdd = vi.hoisted(() => vi.fn());

vi.mock("../../worker/worker.queues.js", () => ({
  getGraphRebuildQueue: () => ({ add: mockQueueAdd }),
}));

import { handleRebuild } from "../graph.handler.js";

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as import("express").Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe("handleRebuild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockResolvedValue({ id: "job-1" });
  });

  it("enqueues a graph-rebuild job", async () => {
    const req = {} as import("express").Request;
    const res = makeRes();

    await handleRebuild(req, res);

    expect(mockQueueAdd).toHaveBeenCalledWith("graph-rebuild", { full: true });
  });

  it("returns 202 with status queued", async () => {
    const req = {} as import("express").Request;
    const res = makeRes();

    await handleRebuild(req, res);

    expect(res.status as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(202);
    expect(res.json as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "queued" } }),
    );
  });
});
