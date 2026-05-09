import { Queue } from "bullmq";
import { getRedisConnection } from "./worker.connection.js";

export interface ChunkFileJob {
  filePath: string;
  fileId: string;
}

export interface ChunkBookJob {
  bookId: string;
}

export interface CaptureUrlJob {
  url: string;
  fileId: string;
  serverPath: string;
  note?: string;
}

export interface SyncIndexJob {
  vaultId: string;
  gitPath: string;
  fromSha: string;
  toSha: string;
  include: string[];
  exclude: string[];
}

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
};

let _fileQueue: Queue<ChunkFileJob> | null = null;
let _bookQueue: Queue<ChunkBookJob> | null = null;
let _captureQueue: Queue<CaptureUrlJob> | null = null;
let _syncIndexQueue: Queue<SyncIndexJob> | null = null;

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

export function getCaptureQueue(): Queue<CaptureUrlJob> {
  if (!_captureQueue) {
    _captureQueue = new Queue<CaptureUrlJob>("capture-url", {
      connection: getRedisConnection(),
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return _captureQueue;
}

export function getSyncIndexQueue(): Queue<SyncIndexJob> {
  if (!_syncIndexQueue) {
    _syncIndexQueue = new Queue<SyncIndexJob>("sync-index", {
      connection: getRedisConnection(),
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return _syncIndexQueue;
}
