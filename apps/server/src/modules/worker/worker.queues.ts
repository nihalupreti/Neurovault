import { Queue } from "bullmq";
import { getRedisConnection } from "./worker.connection.js";

export interface ChunkFileJob {
  filePath: string;
  fileId: string;
}

export interface ChunkBookJob {
  bookId: string;
}

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
};

let _fileQueue: Queue<ChunkFileJob> | null = null;
let _bookQueue: Queue<ChunkBookJob> | null = null;

export function getFileQueue(): Queue<ChunkFileJob> {
  if (!_fileQueue) {
    _fileQueue = new Queue<ChunkFileJob>("chunk-file", {
      connection: getRedisConnection(),
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return _fileQueue;
}

export function getBookQueue(): Queue<ChunkBookJob> {
  if (!_bookQueue) {
    _bookQueue = new Queue<ChunkBookJob>("chunk-book", {
      connection: getRedisConnection(),
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return _bookQueue;
}
