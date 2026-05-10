import { promises as fs } from "fs";
import fileModel from "./files.model.js";
import { parseWikilinks } from "../graph/graph.wikilink-parser.js";
import { resolveWikilinks } from "../graph/graph.resolve-links.js";
import {
  upsertFileNode,
  upsertFolderNode,
  syncWikilinks,
  syncHierarchy,
} from "../graph/graph.service.js";

export async function onFileIndexed(
  filePath: string,
  fileId: string
): Promise<void> {
  const file = await fileModel.findById(fileId);
  if (!file) return;

  await upsertFileNode(fileId, file.name, file.serverPath || "");
  await projectHierarchy(fileId, file.parentId?.toString() || null);

  const markdown = await fs.readFile(filePath, "utf-8");
  const wikilinks = parseWikilinks(markdown);
  const resolved = await resolveWikilinks(wikilinks);
  await syncWikilinks(fileId, resolved);
}

async function projectHierarchy(
  fileId: string,
  parentId: string | null
): Promise<void> {
  if (!parentId) return;

  const parent = await fileModel.findById(parentId);
  if (!parent || parent.type !== "folder") return;

  const folderId = parent._id.toString();
  await upsertFolderNode(folderId, parent.name, parent.serverPath || "");
  await syncHierarchy(fileId, "File", folderId);

  await projectAncestorFolders(folderId, parent.parentId?.toString() || null);
}

async function projectAncestorFolders(
  childFolderId: string,
  parentId: string | null
): Promise<void> {
  if (!parentId) return;

  const parent = await fileModel.findById(parentId);
  if (!parent || parent.type !== "folder") return;

  const folderId = parent._id.toString();
  await upsertFolderNode(folderId, parent.name, parent.serverPath || "");
  await syncHierarchy(childFolderId, "Folder", folderId);

  await projectAncestorFolders(folderId, parent.parentId?.toString() || null);
}
