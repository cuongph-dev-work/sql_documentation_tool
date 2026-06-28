import { z } from "zod";

export const enrichedTextSchema = z.object({
  value: z.string().min(1),
  source: z.enum(["db_comment", "backend_source", "ai"]),
  confidence: z.enum(["high", "medium", "low"]),
  needsReview: z.boolean()
});

export const reviewTodoSchema = z.object({
  type: z.enum(["table", "column", "relationship", "ai", "parser"]),
  target: z.string().min(1),
  issue: z.string().min(1),
  suggestion: z.string().optional(),
  source: z.enum(["schema", "backend_source", "ai", "parser"])
});

export const columnDocSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.string().optional(),
  nullable: z.boolean(),
  defaultValue: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  isUnique: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  comment: z.string().optional(),
  description: enrichedTextSchema.optional(),
  constraintNotes: z.array(z.string()).optional()
});

export const foreignKeyDocSchema = z.object({
  name: z.string().optional(),
  columns: z.array(z.string().min(1)),
  referencedTable: z.string().min(1),
  referencedColumns: z.array(z.string().min(1))
});

export const indexDocSchema = z.object({
  name: z.string().min(1),
  table: z.string().min(1),
  columns: z.array(z.string().min(1)),
  unique: z.boolean()
});

export const relationshipDocSchema = z.object({
  fromTable: z.string().min(1),
  fromColumn: z.string().min(1),
  toTable: z.string().min(1),
  toColumn: z.string().min(1),
  constraintName: z.string().optional(),
  source: z.enum(["schema", "ai_suggestion"]),
  needsReview: z.boolean()
});

export const warningDocSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  target: z.string().optional(),
  severity: z.enum(["info", "warning", "error"])
});

export const tableDocSchema = z.object({
  name: z.string().min(1),
  schema: z.string().optional(),
  comment: z.string().optional(),
  description: enrichedTextSchema.optional(),
  columns: z.array(columnDocSchema),
  primaryKeys: z.array(z.string()),
  foreignKeys: z.array(foreignKeyDocSchema),
  indexes: z.array(indexDocSchema),
  reviewTodos: z.array(reviewTodoSchema)
});

export const databaseDocSchema = z.object({
  dialect: z.enum([
    "postgres",
    "mysql",
    "mariadb",
    "sqlite",
    "mssql",
    "unknown"
  ]),
  tables: z.array(tableDocSchema),
  relationships: z.array(relationshipDocSchema),
  indexes: z.array(indexDocSchema),
  warnings: z.array(warningDocSchema)
});
