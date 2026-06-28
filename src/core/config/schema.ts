import { z } from "zod";

export const outputFormatSchema = z.enum([
  "excel",
  "markdown",
  "html",
  "diagram",
  "word"
]);

export const dbdocgenConfigSchema = z.object({
  schema: z.string().default("./schema.sql"),
  outDir: z.string().default("./docs/db"),
  context: z
    .object({
      source: z
        .object({
          enabled: z.boolean().default(false),
          rootDir: z.string().default("./src"),
          include: z
            .array(z.string())
            .default([
              "**/*.ts",
              "**/*.js",
              "**/*.rb",
              "**/*.php",
              "**/*.py",
              "**/*.java"
            ]),
          exclude: z
            .array(z.string())
            .default([
              "**/node_modules/**",
              "**/dist/**",
              "**/build/**",
              "**/.next/**",
              "**/coverage/**",
              "**/.git/**"
            ])
        })
        .default({} as never)
    })
    .default({} as never),
  ai: z
    .object({
      enabled: z.boolean().default(true),
      provider: z
        .enum(["9router", "openai", "openai-compatible"])
        .default("9router"),
      baseURL: z.string().optional(),
      apiKeyEnv: z.string().default("NINE_ROUTER_API_KEY"),
      model: z.string().default("openai/gpt-4.1-mini"),
      temperature: z.number().default(0.2),
      maxTokens: z.number().int().positive().default(6000),
      rulesDir: z.string().default("./.ai/rules")
    })
    .default({} as never),
  output: z
    .object({
      formats: z
        .array(outputFormatSchema)
        .default(["excel", "markdown", "html", "diagram", "word"]),
      language: z.string().default("vi")
    })
    .default({} as never)
});

export type OutputFormat = z.infer<typeof outputFormatSchema>;
export type DbdocgenConfig = z.infer<typeof dbdocgenConfigSchema>;
