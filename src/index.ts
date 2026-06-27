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
