import { BadRequestError } from "../../errors/app-error.js";

export class InvalidSearchQueryError extends BadRequestError {
  constructor(message: string) { super(message); }
}
