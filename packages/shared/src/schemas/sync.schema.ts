import { z } from "zod";

export const createVaultSchema = z.object({
  name: z.string().min(1, "name is required"),
  syncConfig: z.object({
    include: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
  }).optional(),
});

export type CreateVaultInput = z.infer<typeof createVaultSchema>;

export const pushChangesSchema = z.object({
  changes: z.array(z.object({
    path: z.string().min(1),
    action: z.enum(["upsert", "delete"]),
    content: z.string().optional(),
    clientHash: z.string(),
  })).min(1, "changes array required"),
  baseCommit: z.string().optional().default(""),
});

export type PushChangesInput = z.infer<typeof pushChangesSchema>;

export const resolveConflictSchema = z.object({
  resolution: z.enum(["accept_server", "accept_client", "manual_merge"]),
  content: z.string().optional(),
}).refine(
  (d) => d.resolution !== "manual_merge" || (d.content && d.content.length > 0),
  { message: "content required for manual_merge", path: ["content"] }
);

export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>;
