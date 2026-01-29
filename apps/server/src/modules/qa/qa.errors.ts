import { AppError } from "../../errors/app-error.js";

export class ProviderConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, "PROVIDER_CONFIG_ERROR", true);
  }
}
