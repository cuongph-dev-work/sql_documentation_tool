import { readFile } from "node:fs/promises";
import type { OutputFormat } from "../config/schema";
import type { DatabaseDialect, DatabaseDoc } from "../model/database-doc";
import { exportMermaidDiagram } from "../../exporters/diagram/mermaid-exporter";
import { exportExcelDictionary } from "../../exporters/excel/excel-exporter";
import { exportMarkdownDocs } from "../../exporters/markdown/markdown-exporter";
import { exportHtmlDocs } from "../../exporters/html/html-exporter";
import { exportWordDocument } from "../../exporters/word/word-exporter";
import { parseSqlSchema } from "../../parsers/sql/sql-parser";

export type GenerateDbDocsOptions = {
  schema: string;
  outDir: string;
  dialect?: DatabaseDialect;
  output: {
    formats: OutputFormat[];
  };
  ai: {
    enabled: boolean;
  };
};

export async function generateDbDocs(options: GenerateDbDocsOptions): Promise<DatabaseDoc> {
  const sql = await readFile(options.schema, "utf8");
  const doc = await parseSqlSchema(sql, { dialect: options.dialect ?? "postgres" });

  if (options.ai.enabled) {
    doc.warnings.push({
      code: "AI_NOT_IMPLEMENTED",
      message: "AI enrichment is planned for v0.3 and was skipped.",
      severity: "info"
    });
  }

  const exporters: Array<{
    format: OutputFormat;
    fn: () => Promise<void>;
  }> = [];

  if (options.output.formats.includes("excel")) {
    exporters.push({
      format: "excel",
      fn: () => exportExcelDictionary(doc, { outDir: options.outDir }),
    });
  }

  if (options.output.formats.includes("diagram")) {
    exporters.push({
      format: "diagram",
      fn: () => exportMermaidDiagram(doc, { outDir: options.outDir }),
    });
  }

  if (options.output.formats.includes("markdown")) {
    exporters.push({
      format: "markdown",
      fn: () => exportMarkdownDocs(doc, { outDir: options.outDir }),
    });
  }

  if (options.output.formats.includes("html")) {
    exporters.push({
      format: "html",
      fn: () => exportHtmlDocs(doc, { outDir: options.outDir }),
    });
  }

  if (options.output.formats.includes("word")) {
    exporters.push({
      format: "word",
      fn: () => exportWordDocument(doc, { outDir: options.outDir }),
    });
  }

  for (const { format, fn } of exporters) {
    try {
      await fn();
    } catch (err) {
      console.error(
        `[dbdocgen] Failed to export ${format} docs:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return doc;
}
