import { NotFoundError, BadRequestError } from "../../errors/app-error.js";

export class AnnotationNotFoundError extends NotFoundError {
  constructor(id: string) { super("Annotation", id); }
}

export class InvalidAnnotationError extends BadRequestError {
  constructor(message: string) { super(message); }
}
