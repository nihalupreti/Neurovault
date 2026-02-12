import { NotFoundError, BadRequestError } from "../../errors/app-error.js";

export class VaultNotFoundError extends NotFoundError {
  constructor(id?: string) { super("Vault", id); }
}

export class ConflictNotFoundError extends NotFoundError {
  constructor(id: string) { super("Conflict", id); }
}

export class InvalidSyncPayloadError extends BadRequestError {
  constructor(message: string) { super(message); }
}
