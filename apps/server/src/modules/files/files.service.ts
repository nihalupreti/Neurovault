import { readFile } from "fs/promises";
import path from "path";
import fileModel from "./files.model.js";
import { emitFileUploaded } from "./files.events.js";

export async function createFileDocs(files: Express.Multer.File[]) {
  const docs = await Promise.all(
    files.map((file) =>
      fileModel.create({
        name: file.originalname,
        serverPath: file.path,
        type: "file",
      })
    )
  );

  for (const doc of docs) {
    emitFileUploaded(doc.serverPath, doc._id).catch((err) =>
      console.error("Background index error:", err)
    );
  }

  return docs;
}

export async function createFolderStructure(
  files: Express.Multer.File[],
  relativePaths: string[]
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const parts = relativePaths[i]!.split("/");
    let parentId: string | null = null;

    for (let j = 0; j < parts.length; j++) {
      const isFile = j === parts.length - 1;
      const nodeName = parts[j];

      if (isFile) {
        const fileDoc = await fileModel.create({
          name: nodeName,
          serverPath: file!.path,
          parentId,
          type: "file",
        });
        await emitFileUploaded(fileDoc.serverPath, fileDoc._id);
      } else {
        let folderDoc = await fileModel.findOne({
          name: nodeName,
          parentId,
          type: "folder",
        });

        if (!folderDoc) {
          folderDoc = await fileModel.create({
            name: nodeName,
            parentId,
            type: "folder",
          });
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

  const formatted = children.map((doc) => ({
    _id: doc._id,
    type: doc.type,
    name: doc.name,
    ...(doc.type === "folder" ? { children: [] } : {}),
  }));

  if (!parentId) {
    return { _id: "1", name: "root", type: "folder", children: formatted };
  }

  const parentDoc = await fileModel.findById(parentId);
  if (!parentDoc) return null;

  return { name: parentDoc.name, children: formatted };
}
