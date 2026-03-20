import { UnauthorizedError } from "../../errors/app-error.js";

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super("Invalid credentials");
  }
}
