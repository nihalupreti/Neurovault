import { Redis } from "ioredis";

let _connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!_connection) {
    _connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    _connection.on("error", (err: Error) => console.error("Redis error:", err));
  }
  return _connection;
}
