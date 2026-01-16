export type Role = "admin" | "guest";

declare global {
  namespace Express {
    interface Request {
      role: Role;
    }
  }
}
