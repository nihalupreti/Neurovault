import { readFile } from "fs/promises";
import path from "path";
import fileModel from "./files.model.js";
import { emitFileUploaded } from "./files.events.js";
import {
  findVaultContext,
  computeVaultPath,
  syncUploadToVault,
  syncDeleteToVault,
} from "./files.vault-bridge.js";

export async function createFileDocs(files: Express.Multer.File[], parentId?: string | null) {
  const vaultCtx = parentId ? await findVaultContext(parentId) : null;

  const docs = await Promise.all(
    files.map(async (file) => {
      const doc: Record<string, unknown> = {
        name: file.originalname,
        serverPath: file.path,
        type: "file",
        parentId: parentId || null,
      };

      if (vaultCtx) {
        const vaultPath = await computeVaultPath(file.originalname, parentId || null);
        doc.vaultId = vaultCtx.vaultId;
        doc.vaultPath = vaultPath;
      }

      return fileModel.create(doc);
    }),
  );

  for (const doc of docs) {
    emitFileUploaded(doc.serverPath, doc._id).catch((err) =>
      console.error("Background index error:", err),
    );

    if (vaultCtx && doc.vaultPath) {
      syncUploadToVault(vaultCtx, doc.vaultPath, doc.serverPath).catch((err) =>
        console.error("Vault sync error:", err),
      );
    }
  }

  return docs;
}

export async function createFolderStructure(
  files: Express.Multer.File[],
  relativePaths: string[],
  rootParentId?: string | null,
) {
  const vaultCtx = rootParentId ? await findVaultContext(rootParentId) : null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const parts = relativePaths[i]!.split("/");
    let parentId: string | null = rootParentId || null;

    for (let j = 0; j < parts.length; j++) {
      const isFile = j === parts.length - 1;
      const nodeName = parts[j];

      if (isFile) {
        const doc: Record<string, unknown> = {
          name: nodeName,
          serverPath: file!.path,
          parentId,
          type: "file",
        };

        if (vaultCtx) {
          const vaultPath = await computeVaultPath(nodeName, parentId);
          doc.vaultId = vaultCtx.vaultId;
          doc.vaultPath = vaultPath;
        }

        const fileDoc = await fileModel.create(doc);
        emitFileUploaded(fileDoc.serverPath, fileDoc._id).catch((err) =>
          console.error("Background index error:", err),
        );

        if (vaultCtx && fileDoc.vaultPath) {
          syncUploadToVault(vaultCtx, fileDoc.vaultPath, fileDoc.serverPath).catch((err) =>
            console.error("Vault sync error:", err),
          );
        }
      } else {
        let folderDoc = await fileModel.findOne({
          name: nodeName,
          parentId,
          type: "folder",
        });

        if (!folderDoc) {
          const folderFields: Record<string, unknown> = {
            name: nodeName,
            parentId,
            type: "folder",
          };

          if (vaultCtx) {
            const vaultPath = await computeVaultPath(nodeName, parentId);
            folderFields.vaultId = vaultCtx.vaultId;
            folderFields.vaultPath = vaultPath;
          }

          folderDoc = await fileModel.create(folderFields);
        }

        parentId = String(folderDoc._id);
      }
    }
  }
}

export async function getFileContent(fileId: string, role: string) {
  const fileDoc = await fileModel.findById(fileId, "serverPath public");

  if (!fileDoc || (role === "guest" && !fileDoc.public)) {
    return { error: "not_found" as const };
  }

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
  const filePath = path.resolve(fileDoc.serverPath.replace(/\\/g, "/"));
  if (!filePath.startsWith(uploadDir)) {
    return { error: "access_denied" as const };
  }

  try {
    const data = await readFile(filePath, "utf-8");
    return { data };
  } catch {
    return { error: "not_found" as const };
  }
}

export async function setVisibility(fileId: string, isPublic: boolean) {
  return fileModel.findByIdAndUpdate(fileId, { public: isPublic }, { new: true });
}

export async function getFolderChildren(parentId: string | null, role: string) {
  const filter: Record<string, unknown> = { parentId };
  if (role === "guest") filter.public = true;

  const children = await fileModel.find(filter);

  const formatted = await Promise.all(
    children.map(async (doc) => {
      if (doc.type === "folder") {
        const childCount = await fileModel.countDocuments({ parentId: doc._id });
        return { _id: doc._id, type: doc.type, name: doc.name, children: [], childCount };
      }
      return { _id: doc._id, type: doc.type, name: doc.name };
    }),
  );

  if (!parentId) {
    return { _id: "1", name: "root", type: "folder", children: formatted };
  }

  const parentDoc = await fileModel.findById(parentId);
  if (!parentDoc) return null;

  return { name: parentDoc.name, children: formatted };
}

export async function deleteFile(fileId: string) {
  const doc = await fileModel.findById(fileId);
  if (!doc) return null;

  if (doc.serverPath) {
    try {
      const { unlink } = await import("fs/promises");
      await unlink(path.resolve(doc.serverPath));
    } catch {
      // file already gone
    }
  }

  if (doc.vaultId && doc.vaultPath) {
    const vaultCtx = await findVaultContext(doc.parentId);
    if (vaultCtx) {
      await syncDeleteToVault(vaultCtx, doc.vaultPath).catch((err) =>
        console.error("Vault delete sync error:", err),
      );
    }
  }

  await fileModel.findByIdAndDelete(fileId);
  return doc;
}
