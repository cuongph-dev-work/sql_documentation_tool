import { z } from "zod";

export const aiColumnDescriptionSchema = z.object({
  description: z.string().min(1),
  source: z.enum(["backend_source", "ai", "db_comment"]),
  confidence: z.enum(["high", "medium", "low"]),
  needsReview: z.boolean()
});

export const aiTableEnrichResponseSchema = z.object({
  table: z.string().min(1),
  purpose: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  businessNotes: z.array(z.string()).optional(),
  columnDescriptions: z.record(z.string(), aiColumnDescriptionSchema).optional(),
  reviewTodos: z.array(z.string()).optional()
});

export type AiColumnDescription = z.infer<typeof aiColumnDescriptionSchema>;
export type AiTableEnrichResponse = z.infer<typeof aiTableEnrichResponseSchema>;
