import { NotFoundError, BadRequestError } from "../../errors/app-error.js";

export class BookNotFoundError extends NotFoundError {
  constructor(id?: string) { super("Book", id); }
}

export class ChapterNotFoundError extends NotFoundError {
  constructor(chapterNum?: string) { super("Chapter", chapterNum); }
}

export class NoFileUploadedError extends BadRequestError {
  constructor() { super("No file uploaded"); }
}

export class InvalidEpubError extends BadRequestError {
  constructor(reason: string) {
    super(`Invalid EPUB file: ${reason}`);
  }
}
