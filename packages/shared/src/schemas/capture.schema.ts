import { z } from "zod";

export const captureSchema = z.object({
  content: z.string().min(1, "content is required"),
  note: z.string().optional(),
  folderId: z.string().optional(),
});

export type CaptureInput = z.infer<typeof captureSchema>;
