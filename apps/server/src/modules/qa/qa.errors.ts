import { AppError } from "../../errors/app-error.js";
import { NotFoundError } from "../../errors/app-error.js";

export class ProviderConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, "PROVIDER_CONFIG_ERROR", true);
  }
}

export class ConversationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Conversation", id);
  }
}
