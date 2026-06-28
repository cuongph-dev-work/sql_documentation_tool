#!/usr/bin/env node
import { Command } from "commander";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "../core/config/loader";
import { dbdocgenConfigSchema } from "../core/config/schema";
import { generateDbDocs } from "../core/pipeline/generate-db-docs";
import { parseSqlSchema } from "../parsers/sql/sql-parser";
import { outputFormatSchema, type OutputFormat } from "../core/config/schema";
import {
  isOutputRunDir,
  isOutputRunDirName,
  resolveGenerateOutDir
} from "../core/output-path";

const DEFAULT_CONFIG_PATH = "dbdocgen.config.json";

const program = new Command();

program
  .name("dbdocgen")
  .description("Generate database documentation from SQL schema files.")
  .version("0.1.0");

// ── init ──────────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Create a default config file")
  .option("-f, --force", "Overwrite existing config file")
  .action(async (rawOptions) => {
    const configPath = resolve(process.cwd(), DEFAULT_CONFIG_PATH);

    if (existsSync(configPath) && !rawOptions.force) {
      console.log(`Config already exists at ${configPath}. Use --force to overwrite.`);
      return;
    }

    const defaultConfig = {
      schema: "./database/schema.sql",
      outDir: "./output",
      output: {
        formats: ["excel", "markdown", "html", "diagram", "word"],
        language: "en"
      }
    };

    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
    console.log(`Created config at ${configPath}`);
    console.log(
      "Each generate run writes to {outDir}/db_doc_gen_{yymmddhhmm} (outDir defaults to ./output)."
    );
    console.log("Edit the file to configure your database schema path and output formats.");
  });

// ── config show / config validate ─────────────────────────────────────────────

const configCommand = program
  .command("config")
  .description("Manage configuration");

configCommand
  .command("show")
  .description("Show resolved configuration")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: { configPath: rawOptions.config }
    });
    console.log(JSON.stringify(config, null, 2));
  });

configCommand
  .command("validate")
  .description("Validate config file")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    try {
      const config = await loadConfig({
        cwd: process.cwd(),
        cliOptions: { configPath: rawOptions.config }
      });
      const result = dbdocgenConfigSchema.safeParse(config);
      if (result.success) {
        console.log("Config is valid.");
      } else {
        console.error("Config validation failed:");
        console.error(result.error.format());
        process.exitCode = 1;
      }
    } catch (err) {
      console.error("Failed to load config:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

// ── generate ──────────────────────────────────────────────────────────────────

program
  .command("generate")
  .description("Generate database documentation")
  .option("--schema <path>", "Path to schema.sql")
  .option("--out <path>", "Parent output directory (run folder: db_doc_gen_{yymmddhhmm})")
  .option("--format <formats>", "Comma-separated output formats")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    console.log("[dbdocgen] Loading configuration...");
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        schema: rawOptions.schema,
        outDir: rawOptions.out,
        formats: parseFormats(rawOptions.format),
        configPath: rawOptions.config
      }
    });

    const parentOutDir = config.outDir;
    const outDir = resolveGenerateOutDir(parentOutDir);

    console.log("[dbdocgen] Configuration loaded");
    console.log(`  schema: ${config.schema}`);
    console.log(`  outputParent: ${parentOutDir}`);
    console.log(`  outDir: ${outDir}`);
    console.log(`  formats: ${config.output.formats.join(", ")}`);
    console.log(`  language: ${config.output.language}`);

    const doc = await generateDbDocs({
      schema: config.schema,
      outDir,
      dialect: config.dialect,
      output: {
        formats: config.output.formats,
        language: config.output.language
      },
      onProgress: (event) => {
        console.log(`[dbdocgen] ${event.message}`);
        if (event.detail) {
          for (const [key, value] of Object.entries(event.detail)) {
            console.log(`  ${key}: ${String(value)}`);
          }
        }
      }
    });

    if (doc.warnings.length > 0) {
      console.log(`[dbdocgen] Completed with ${doc.warnings.length} warning(s)`);
      for (const warning of doc.warnings) {
        console.log(
          `  [${warning.severity}] ${warning.code}: ${warning.message}`
        );
      }
    }
    console.log(`Generated database documentation in ${outDir}`);
  });

// ── validate ──────────────────────────────────────────────────────────────────

program
  .command("validate")
  .description("Validate a SQL schema file without generating docs")
  .option("--schema <path>", "Path to schema.sql")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        schema: rawOptions.schema,
        configPath: rawOptions.config
      }
    });

    console.log(`Validating ${config.schema}...`);
    const sql = await readFile(config.schema, "utf8");
    const doc = await parseSqlSchema(sql, { dialect: "postgres" });

    if (doc.tables.length === 0) {
      console.log("No tables found in schema.");
      if (doc.warnings.length > 0) {
        console.log("\nWarnings:");
        for (const w of doc.warnings) {
          console.log(`  [${w.code}] ${w.message}`);
        }
      }
      return;
    }

    console.log(`\nFound ${doc.tables.length} table(s):\n`);
    for (const table of doc.tables) {
      console.log(`  ${table.name}`);
      console.log(`    Columns: ${table.columns.length}`);
      console.log(`    Primary Keys: ${table.primaryKeys.join(", ") || "(none)"}`);
      console.log(`    Foreign Keys: ${table.foreignKeys.length}`);
      console.log("");
    }

    if (doc.warnings.length > 0) {
      console.log(`Warnings (${doc.warnings.length}):`);
      for (const w of doc.warnings) {
        console.log(`  [${w.severity}] ${w.code}: ${w.message}`);
      }
    }

    console.log("Schema validation passed.");
  });

// ── clean ──────────────────────────────────────────────────────────────────────

program
  .command("clean")
  .description("Clean output directory")
  .option("--out <path>", "Parent output directory or a specific db_doc_gen_* run folder")
  .option("--config <path>", "Config file path")
  .action(async (rawOptions) => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        outDir: rawOptions.out,
        configPath: rawOptions.config
      }
    });

    const target = resolve(config.outDir);

    if (!existsSync(target)) {
      console.log(`Output path ${target} does not exist. Nothing to clean.`);
      return;
    }

    if (isOutputRunDir(target)) {
      console.log(`Cleaning ${target}...`);
      await rm(target, { recursive: true, force: true });
      console.log("Done.");
      return;
    }

    const entries = await readdir(target, { withFileTypes: true });
    const runDirs = entries.filter(
      (entry) => entry.isDirectory() && isOutputRunDirName(entry.name)
    );

    if (runDirs.length === 0) {
      console.log(`No db_doc_gen_* folders found under ${target}.`);
      return;
    }

    console.log(`Cleaning ${runDirs.length} run folder(s) under ${target}...`);
    for (const entry of runDirs) {
      await rm(resolve(target, entry.name), { recursive: true, force: true });
    }
    console.log("Done.");
  });

// ── info ──────────────────────────────────────────────────────────────────────

program
  .command("info")
  .description("Show project info and supported features")
  .action(() => {
    console.log("dbdocgen v0.1.0");
    console.log("");
    console.log("Generate database documentation from SQL schema files.");
    console.log("");
    console.log("Supported input:");
    console.log("  - PostgreSQL schema.sql");
    console.log("  - MySQL / MariaDB schema.sql");
    console.log("");
    console.log("Supported output formats:");
    console.log("  - excel       Data Dictionary (.xlsx)");
    console.log("  - markdown    Per-table .md files");
    console.log("  - html        Static HTML documentation");
    console.log("  - diagram     Mermaid ER Diagram (.mmd)");
    console.log("  - word        Word document (.docx)");
    console.log("");
    console.log("Commands:");
    console.log("  init             Create a default config file");
    console.log("  generate         Generate documentation");
    console.log("  validate         Validate SQL schema");
    console.log("  clean            Clean output directory");
    console.log("  config show      Show current config");
    console.log("  config validate  Validate config");
    console.log("  info             Show this info");
  });

// ── main ──────────────────────────────────────────────────────────────────────

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

// ── helpers ───────────────────────────────────────────────────────────────────

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
