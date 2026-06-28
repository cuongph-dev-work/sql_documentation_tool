import { readFile } from "node:fs/promises";
import type { OutputFormat, OutputLanguage } from "../config/schema";
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
    language?: OutputLanguage;
  };
  onProgress?: (event: {
    step: string;
    message: string;
    detail?: Record<string, unknown>;
  }) => void;
};

export async function generateDbDocs(
  options: GenerateDbDocsOptions
): Promise<DatabaseDoc> {
  const progress = (
    step: string,
    message: string,
    detail?: Record<string, unknown>
  ) => {
    options.onProgress?.({ step, message, detail });
  };

  progress("read_schema", "Reading schema file", { schema: options.schema });
  const sql = await readFile(options.schema, "utf8");
  progress("parse_schema", "Parsing schema", { dialect: options.dialect ?? "auto-detect" });
  let doc = await parseSqlSchema(sql, {
    dialect: options.dialect
  });
  progress("schema_parsed", "Schema parsed", {
    tables: doc.tables.length,
    warnings: doc.warnings.length,
    dialect: doc.dialect
  });

  const exporters: Array<{
    format: OutputFormat;
    fn: () => Promise<void>;
  }> = [];

  if (options.output.formats.includes("excel")) {
    exporters.push({
      format: "excel",
      fn: () =>
        exportExcelDictionary(doc, {
          outDir: options.outDir,
          language: options.output.language
        })
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
      fn: () =>
        exportMarkdownDocs(doc, {
          outDir: options.outDir,
          language: options.output.language
        })
    });
  }

  if (options.output.formats.includes("html")) {
    exporters.push({
      format: "html",
      fn: () =>
        exportHtmlDocs(doc, {
          outDir: options.outDir,
          language: options.output.language
        })
    });
  }

  if (options.output.formats.includes("word")) {
    exporters.push({
      format: "word",
      fn: () =>
        exportWordDocument(doc, {
          outDir: options.outDir,
          language: options.output.language
        })
    });
  }

  for (const { format, fn } of exporters) {
    try {
      progress(`export_${format}`, `Exporting ${format} output`, {
        outDir: options.outDir
      });
      await fn();
      progress(`export_${format}_done`, `Exported ${format} output`, {
        outDir: options.outDir
      });
    } catch (err) {
      console.error(
        `[dbdocgen] Failed to export ${format} docs:`,
        err instanceof Error ? err.message : String(err)
      );
      progress(`export_${format}_failed`, `Failed to export ${format}`, {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  progress("complete", "Generation complete", {
    tables: doc.tables.length,
    warnings: doc.warnings.length,
    outDir: options.outDir
  });
  return doc;
}
