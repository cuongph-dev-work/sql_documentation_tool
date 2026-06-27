export type DatabaseDialect = "postgres" | "mysql" | "mariadb" | "sqlite" | "mssql" | "unknown";

export type Confidence = "high" | "medium" | "low";

export type EnrichedText = {
  value: string;
  source: "db_comment" | "backend_source" | "ai";
  confidence: Confidence;
  needsReview: boolean;
};

export type WarningDoc = {
  code: string;
  message: string;
  target?: string;
  severity: "info" | "warning" | "error";
};

export type ReviewTodo = {
  type: "table" | "column" | "relationship" | "ai" | "parser";
  target: string;
  issue: string;
  suggestion?: string;
  source: "schema" | "backend_source" | "ai" | "parser";
};

export type ColumnDoc = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  comment?: string;
  description?: EnrichedText;
};

export type ForeignKeyDoc = {
  name?: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
};

export type IndexDoc = {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
};

export type RelationshipDoc = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName?: string;
  source: "schema" | "ai_suggestion";
  needsReview: boolean;
};

export type TableDoc = {
  name: string;
  schema?: string;
  comment?: string;
  description?: EnrichedText;
  columns: ColumnDoc[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyDoc[];
  indexes: IndexDoc[];
  reviewTodos: ReviewTodo[];
};

export type DatabaseDoc = {
  dialect: DatabaseDialect;
  tables: TableDoc[];
  relationships: RelationshipDoc[];
  indexes: IndexDoc[];
  warnings: WarningDoc[];
};
