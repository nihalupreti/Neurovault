import { BadRequestError } from "../../errors/app-error.js";

export class EmptyCaptureError extends BadRequestError {
  constructor() { super("content is required"); }
}
