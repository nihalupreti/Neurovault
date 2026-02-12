import { ServiceUnavailableError, NotFoundError } from "../../errors/app-error.js";

export class GraphUnavailableError extends ServiceUnavailableError {
  constructor() { super("Graph"); }
}

export class FileNotInGraphError extends NotFoundError {
  constructor(fileId: string) { super("File in graph", fileId); }
}
