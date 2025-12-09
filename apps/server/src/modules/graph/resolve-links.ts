import fileModel from "../files/fileMetadata.model.js";
import type { WikiLink, ResolvedLink } from "./types.js";

export async function resolveWikilinks(
  links: WikiLink[]
): Promise<ResolvedLink[]> {
  const resolved: ResolvedLink[] = [];

  for (const link of links) {
    const target = link.target.replace(/\.md$/i, "");

    let file = await fileModel.findOne({
      serverPath: { $regex: new RegExp(`${escapeRegex(target)}\\.md$`, "i") },
      type: "file",
    });

    if (!file) {
      const name = target.split("/").pop()!;
      file = await fileModel.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(name)}\\.md$`, "i") },
        type: "file",
      });
    }

    if (file) {
      resolved.push({
        targetFileId: file._id.toString(),
        anchor: link.target,
      });
    }
  }

  return resolved;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
