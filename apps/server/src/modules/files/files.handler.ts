import { Request, Response } from "express";
import {
  createFileDocs,
  createFolderStructure,
  getFileContent,
  setVisibility,
  getFolderChildren,
  deleteFile,
} from "./files.service.js";
import { apiSuccess } from "../../utils/api-response.js";
import { UnauthorizedError, BadRequestError } from "../../errors/app-error.js";
import { FileNotFoundError, FolderNotFoundError, FileAccessDeniedError } from "./files.errors.js";

export const handleFileUploads = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const parentId = (req.body.parentId as string) || null;
  const docs = await createFileDocs(files, parentId);
  apiSuccess(res, docs);
};

export const handleFolderUploads = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const relativePaths: string[] = req.body.relativePaths;
  const parentId = (req.body.parentId as string) || null;
  await createFolderStructure(files, relativePaths, parentId);
  apiSuccess(res, null);
};

export const handleFileRequest = async (req: Request, res: Response) => {
  const fileId = req.query.id as string;
  const result = await getFileContent(fileId, req.role);

  if ("error" in result) {
    if (result.error === "access_denied") {
      throw new FileAccessDeniedError();
    }
    throw new FileNotFoundError();
  }

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.send(result.data);
};

export const toggleVisibility = async (req: Request, res: Response) => {
  if (req.role !== "admin") {
    throw new UnauthorizedError();
  }

  const id = req.params.id as string;
  const { public: isPublic } = req.body as { public?: boolean };

  if (typeof isPublic !== "boolean") {
    throw new BadRequestError("public field must be a boolean");
  }

  const file = await setVisibility(id, isPublic);
  if (!file) throw new FileNotFoundError();

  apiSuccess(res, { _id: file._id, name: file.name, public: file.public });
};

export const getFolderTree = async (req: Request, res: Response) => {
  const parentId = (req.query.parentId as string) || null;
  const result = await getFolderChildren(parentId, req.role);

  if (!result) {
    throw new FolderNotFoundError();
  }

  apiSuccess(res, result);
};

export const handleDeleteFile = async (req: Request, res: Response) => {
  if (req.role !== "admin") {
    throw new UnauthorizedError();
  }

  const id = req.params.id as string;
  const result = await deleteFile(id);
  if (!result) throw new FileNotFoundError();

  apiSuccess(res, { _id: result._id, name: result.name });
};
