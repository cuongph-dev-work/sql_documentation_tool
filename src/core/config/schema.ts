import { z } from "zod";

const dialectSchema = z.enum([
  "postgres",
  "mysql",
  "mariadb",
  "sqlite",
  "mssql",
  "unknown"
]);

export const outputFormatSchema = z.enum([
  "excel",
  "markdown",
  "html",
  "diagram",
  "word"
]);

export const outputLanguageSchema = z.enum(["en", "jp"]);

export const dbdocgenConfigSchema = z.object({
  schema: z.string().default("./schema.sql"),
  dialect: dialectSchema.optional(),
  outDir: z.string().default("./docs/db"),
  output: z
    .object({
      formats: z
        .array(outputFormatSchema)
        .default(["excel", "markdown", "html", "diagram", "word"]),
      language: outputLanguageSchema.default("en")
    })
    .default({} as never)
});

export type OutputFormat = z.infer<typeof outputFormatSchema>;
export type OutputLanguage = z.infer<typeof outputLanguageSchema>;
export type DbdocgenConfig = z.infer<typeof dbdocgenConfigSchema>;
