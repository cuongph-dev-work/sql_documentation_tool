#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "../core/config/loader";
import { generateDbDocs } from "../core/pipeline/generate-db-docs";
import { outputFormatSchema, type OutputFormat } from "../core/config/schema";

const program = new Command();

program
  .name("dbdocgen")
  .description("Generate database documentation from SQL schema files.")
  .version("0.1.0");

program
  .command("generate")
  .description("Generate database documentation")
  .option("--schema <path>", "Path to schema.sql")
  .option("--source <path>", "Backend source directory")
  .option("--out <path>", "Output directory")
  .option("--format <formats>", "Comma-separated output formats")
  .option("--ai", "Enable AI enrichment")
  .option("--no-ai", "Disable AI enrichment")
  .option("--ai-provider <provider>", "AI provider")
  .option("--ai-base-url <url>", "OpenAI-compatible base URL")
  .option("--ai-model <model>", "AI model")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        schema: rawOptions.schema,
        source: rawOptions.source,
        outDir: rawOptions.out,
        formats: parseFormats(rawOptions.format),
        ai: rawOptions.ai,
        aiProvider: rawOptions.aiProvider,
        aiBaseUrl: rawOptions.aiBaseUrl,
        aiModel: rawOptions.aiModel,
        configPath: rawOptions.config
      }
    });

    await generateDbDocs({
      schema: config.schema,
      outDir: config.outDir,
      output: { formats: config.output.formats },
      ai: {
        enabled: config.ai.enabled,
        provider: config.ai.provider,
        baseURL: config.ai.baseURL,
        apiKeyEnv: config.ai.apiKeyEnv,
        model: config.ai.model,
        temperature: config.ai.temperature,
        maxTokens: config.ai.maxTokens,
        rulesDir: config.ai.rulesDir
      },
      context: config.context
    });

    console.log(`Generated database documentation in ${config.outDir}`);
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function parseFormats(value?: string): OutputFormat[] | undefined {
  if (!value) return undefined;
  const items = value.split(",").map((item) => item.trim());
  const valid: OutputFormat[] = [];
  for (const item of items) {
    const parsed = outputFormatSchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      console.warn(`Warning: Unrecognized format "${item}" — must be one of: ${outputFormatSchema.options.join(", ")}`);
    }
  }
  return valid.length > 0 ? valid : undefined;
}
