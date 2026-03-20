import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1, "Query parameter 'q' is required").max(1000, "Query must be 1000 chars or less"),
});
