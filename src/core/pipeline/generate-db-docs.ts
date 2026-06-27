import { readFile } from "node:fs/promises";
import type { OutputFormat } from "../config/schema";
import type { DatabaseDialect, DatabaseDoc } from "../model/database-doc";
import { exportMermaidDiagram } from "../../exporters/diagram/mermaid-exporter";
import { exportExcelDictionary } from "../../exporters/excel/excel-exporter";
import { exportMarkdownDocs } from "../../exporters/markdown/markdown-exporter";
import { exportHtmlDocs } from "../../exporters/html/html-exporter";
import { exportWordDocument } from "../../exporters/word/word-exporter";
import { parseSqlSchema } from "../../parsers/sql/sql-parser";
import { enrichDatabaseDoc } from "../../ai/enrichers/schema-enricher";
import { loadAiRules } from "../../ai/rules/rule-loader";
import { scanSourceContext } from "../../source-scanner/scanner";

export type GenerateDbDocsOptions = {
  schema: string;
  outDir: string;
  dialect?: DatabaseDialect;
  output: {
    formats: OutputFormat[];
  };
  ai: {
    enabled: boolean;
    provider?: string;
    baseURL?: string;
    apiKeyEnv?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    rulesDir?: string;
  };
  context?: {
    source?: {
      enabled?: boolean;
      rootDir?: string;
      include?: string[];
      exclude?: string[];
    };
  };
};

export async function generateDbDocs(options: GenerateDbDocsOptions): Promise<DatabaseDoc> {
  const sql = await readFile(options.schema, "utf8");
  let doc = await parseSqlSchema(sql, { dialect: options.dialect ?? "postgres" });

  if (options.ai.enabled) {
    try {
      const rules = await loadAiRules(options.ai.rulesDir);
      const apiKey = process.env[options.ai.apiKeyEnv ?? "NINE_ROUTER_API_KEY"] ?? "";

      let sourceContext;
      if (options.context?.source?.enabled) {
        const tableNames = doc.tables.map((t) => t.name);
        sourceContext = await scanSourceContext({
          rootDir: options.context.source.rootDir ?? "./src",
          include: options.context.source.include ?? ["**/*.ts", "**/*.js", "**/*.rb", "**/*.php", "**/*.py", "**/*.java"],
          exclude: options.context.source.exclude ?? ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**", "**/.git/**"],
          tableNames
        });
      }

      doc = await enrichDatabaseDoc({
        doc,
        providerConfig: {
          apiKey,
          baseURL: options.ai.baseURL,
          model: options.ai.model ?? "openai/gpt-4.1-mini",
          temperature: options.ai.temperature,
          maxTokens: options.ai.maxTokens
        },
        rules,
        sourceContext: sourceContext ?? undefined
      });
    } catch (err) {
      doc.warnings.push({
        code: "AI_ENRICH_FAILED",
        message: `AI enrichment pipeline failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        severity: "error"
      });
    }
  }

  const exporters: Array<{
    format: OutputFormat;
    fn: () => Promise<void>;
  }> = [];

  if (options.output.formats.includes("excel")) {
    exporters.push({
      format: "excel",
      fn: () => exportExcelDictionary(doc, { outDir: options.outDir })
    });
  }

  if (options.output.formats.includes("diagram")) {
    exporters.push({
      format: "diagram",
      fn: () => exportMermaidDiagram(doc, { outDir: options.outDir })
    });
  }

  if (options.output.formats.includes("markdown")) {
    exporters.push({
      format: "markdown",
      fn: () => exportMarkdownDocs(doc, { outDir: options.outDir })
    });
  }

  if (options.output.formats.includes("html")) {
    exporters.push({
      format: "html",
      fn: () => exportHtmlDocs(doc, { outDir: options.outDir })
    });
  }

  if (options.output.formats.includes("word")) {
    exporters.push({
      format: "word",
      fn: () => exportWordDocument(doc, { outDir: options.outDir })
    });
  }

  for (const { format, fn } of exporters) {
    try {
      await fn();
    } catch (err) {
      console.error(
        `[dbdocgen] Failed to export ${format} docs:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return doc;
}
