import { Request, Response } from "express";

import fileModel from "../models/fileMetadata.model.js";
import fs from "fs";

export const handleFileUploads = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  const docs = await Promise.all(
    files.map((file) =>
      fileModel.create({
        name: file.originalname,
        serverPath: file.path,
        type: "file",
      })
    )
  );

  res.json({ success: true, docs });
};

export const handleFolderUploads = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const relativePaths: string[] = req.body.relativePaths;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i];

      const parts = relativePath!.split("/");
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
        } else {
          // Folder — check if it already exists under current parent
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

          parentId = folderDoc._id;
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
};

export const handleFileRequest = async (req: Request, res: Response) => {
  const fileId = req.query.id;

  const fileDoc = await fileModel.findById(fileId, "serverPath");

  if (!fileDoc) {
    return res.status(404).json({ error: "File not found" });
  }

  const filePath = fileDoc.serverPath.replace(/\\/g, "/");
  console.log(filePath);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(404).json({ error: "File not found" });

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.send(data);
  });
};

export const getFolderTree = async (req: Request, res: Response) => {
  const parentId = req.query.parentId || null;

  const children = await fileModel.find({ parentId });

  const formattedChildren = children.map((doc) => ({
    _id: doc._id,
    type: doc.type,
    name: doc.name,
    ...(doc.type === "folder" ? { children: [] } : {}),
  }));

  if (!parentId) {
    // Top-level → wrap in "root"
    return res.json({
      _id: "1",
      name: "root",
      type: "folder",
      children: formattedChildren,
    });
  }

  const parentDoc = await fileModel.findById(parentId);
  if (!parentDoc) {
    return res.status(404).json({ error: "Parent not found" });
  }

  return res.json({
    name: parentDoc.name,
    children: formattedChildren,
  });
};
