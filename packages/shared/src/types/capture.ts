export interface CaptureInput {
  content: string;
  note?: string;
  folderId?: string;
}

export interface CaptureResult {
  fileId: string;
  status: "complete" | "processing";
}
