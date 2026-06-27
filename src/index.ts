export const version = "0.1.0";

export type {
  ColumnDoc,
  Confidence,
  DatabaseDialect,
  DatabaseDoc,
  EnrichedText,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  ReviewTodo,
  TableDoc,
  WarningDoc
} from "./core/model/database-doc";

export { databaseDocSchema } from "./core/model/validation";

export { loadConfig } from "./core/config/loader";
export type { DbdocgenConfig, OutputFormat } from "./core/config/schema";

export { parseSqlSchema } from "./parsers/sql/sql-parser";

export { exportExcelDictionary } from "./exporters/excel/excel-exporter";
export { exportMermaidDiagram, renderMermaid } from "./exporters/diagram/mermaid-exporter";
export { exportMarkdownDocs } from "./exporters/markdown/markdown-exporter";
export { exportHtmlDocs } from "./exporters/html/html-exporter";
export { exportWordDocument } from "./exporters/word/word-exporter";

export { generateDbDocs } from "./core/pipeline/generate-db-docs";
export type { GenerateDbDocsOptions } from "./core/pipeline/generate-db-docs";

export { scanSourceContext } from "./source-scanner/scanner";
export type { ScanSourceContextOptions, SourceChunk, SourceContext, SourceContextFile } from "./source-scanner/scanner";
