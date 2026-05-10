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

export interface BookSimilarityJob {
  bookId: string;
}

export interface GraphIndexJob {
  filePath: string;
  fileId: string;
}

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
};

let _fileQueue: Queue<ChunkFileJob> | null = null;
let _bookQueue: Queue<ChunkBookJob> | null = null;
let _captureQueue: Queue<CaptureUrlJob> | null = null;
let _syncIndexQueue: Queue<SyncIndexJob> | null = null;
let _bookSimilarityQueue: Queue<BookSimilarityJob> | null = null;
let _graphIndexQueue: Queue<GraphIndexJob> | null = null;

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

export function getBookSimilarityQueue(): Queue<BookSimilarityJob> {
  if (!_bookSimilarityQueue) {
    _bookSimilarityQueue = new Queue<BookSimilarityJob>("book-similarity", {
      connection: getRedisConnection(),
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return _bookSimilarityQueue;
}

export function getGraphIndexQueue(): Queue<GraphIndexJob> {
  if (!_graphIndexQueue) {
    _graphIndexQueue = new Queue<GraphIndexJob>("graph-index", {
      connection: getRedisConnection(),
      defaultJobOptions: JOB_OPTIONS,
    });
  }
  return _graphIndexQueue;
}
