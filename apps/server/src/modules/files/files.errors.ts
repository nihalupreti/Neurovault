import { NotFoundError, ForbiddenError } from "../../errors/app-error.js";

export class FileNotFoundError extends NotFoundError {
  constructor() { super("File"); }
}

export class FolderNotFoundError extends NotFoundError {
  constructor() { super("Parent folder"); }
}

export class FileAccessDeniedError extends ForbiddenError {
  constructor() { super("Access denied"); }
}
