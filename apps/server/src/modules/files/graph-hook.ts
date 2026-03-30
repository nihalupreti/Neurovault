import { promises as fs } from "fs";
import fileModel from "./fileMetadata.model.js";
import { parseWikilinks } from "../graph/wikilink-parser.js";
import { resolveWikilinks } from "../graph/resolve-links.js";
import { upsertFileNode, syncWikilinks } from "../graph/graph-service.js";

export async function onFileIndexed(
  filePath: string,
  fileId: string
): Promise<void> {
  const file = await fileModel.findById(fileId);
  if (!file) return;

  await upsertFileNode(fileId, file.name, file.serverPath || "");

  const markdown = await fs.readFile(filePath, "utf-8");
  const wikilinks = parseWikilinks(markdown);
  const resolved = await resolveWikilinks(wikilinks);
  await syncWikilinks(fileId, resolved);
}
