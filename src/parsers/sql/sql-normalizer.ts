import type { DatabaseDialect, DatabaseDoc, IndexDoc, RelationshipDoc, TableDoc } from "../../core/model/database-doc";

type AnyAst = Record<string, unknown>;

export function normalizeSqlAst(ast: unknown, dialect: DatabaseDialect): DatabaseDoc {
  const statements = Array.isArray(ast) ? ast : [ast];
  const tables: TableDoc[] = [];
  const indexes: IndexDoc[] = [];
  const relationships: RelationshipDoc[] = [];

  for (const statement of statements as AnyAst[]) {
    if (statement.type === "create" && statement.keyword === "table") {
      const table = normalizeCreateTable(statement);
      tables.push(table);
      relationships.push(...relationshipsFromTable(table));
    }

    if (statement.type === "create" && statement.keyword === "index") {
      indexes.push(normalizeCreateIndex(statement));
    }
  }

  for (const index of indexes) {
    const table = tables.find((candidate) => candidate.name === index.table);
    table?.indexes.push(index);
  }

  return {
    dialect,
    tables,
    relationships,
    indexes,
    warnings: []
  };
}

function normalizeCreateTable(statement: AnyAst): TableDoc {
  const tableName = extractTableName(statement.table);
  const createDefinitions = Array.isArray(statement.create_definitions) ? (statement.create_definitions as AnyAst[]) : [];

  const table: TableDoc = {
    name: tableName,
    columns: [],
    primaryKeys: [],
    foreignKeys: [],
    indexes: [],
    reviewTodos: []
  };

  for (const definition of createDefinitions) {
    if (definition.resource === "column") {
      const columnName = extractDeepColumnName(definition.column);
      const isPrimaryKey = hasPrimaryKey(definition);
      const isNotNull = hasNotNull(definition);

      table.columns.push({
        name: columnName,
        type: normalizeType(definition.definition),
        nullable: !isNotNull && !isPrimaryKey,
        defaultValue: extractDefaultFromDef(definition),
        isPrimaryKey,
        isForeignKey: false
      });
      if (isPrimaryKey) table.primaryKeys.push(columnName);
    }

    if (definition.resource === "constraint" && isConstraintType(definition.constraint_type, "PRIMARY KEY")) {
      table.primaryKeys = extractDeepColumnNames(definition.definition);
      for (const column of table.columns) {
        if (table.primaryKeys.includes(column.name)) column.isPrimaryKey = true;
      }
    }

    if (definition.resource === "constraint" && isConstraintType(definition.constraint_type, "FOREIGN KEY")) {
      const columns = extractDeepColumnNames(definition.definition);
      const refDef = definition.reference_definition as AnyAst | undefined;
      const referencedTable = extractTableName(refDef?.table);
      const referencedColumns = extractDeepColumnNames(refDef?.definition);
      table.foreignKeys.push({
        name: typeof definition.constraint === "string" ? definition.constraint : undefined,
        columns,
        referencedTable,
        referencedColumns
      });
      for (const column of table.columns) {
        if (columns.includes(column.name)) column.isForeignKey = true;
      }
    }
  }

  return table;
}

function normalizeCreateIndex(statement: AnyAst): IndexDoc {
  return {
    name: String(statement.index ?? statement.index_name ?? "unnamed_index"),
    table: extractTableName(statement.table),
    columns: extractDeepColumnNames(statement.index_columns ?? statement.columns),
    unique: Boolean(statement.unique)
  };
}

function relationshipsFromTable(table: TableDoc): RelationshipDoc[] {
  return table.foreignKeys.flatMap((foreignKey) =>
    foreignKey.columns.map((column, index) => ({
      fromTable: table.name,
      fromColumn: column,
      toTable: foreignKey.referencedTable,
      toColumn: foreignKey.referencedColumns[index] ?? foreignKey.referencedColumns[0] ?? "id",
      constraintName: foreignKey.name,
      source: "schema" as const,
      needsReview: false
    }))
  );
}

function extractTableName(value: unknown): string {
  if (Array.isArray(value)) return extractTableName(value[0]);
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return String(object.table ?? object.tableName ?? object.name ?? "unknown");
  }
  return String(value ?? "unknown");
}

function extractDeepColumnName(value: unknown): string {
  if (typeof value !== "object" || value === null) return String(value ?? "unknown");
  const object = value as Record<string, unknown>;

  if (object.expr && typeof object.expr === "object") {
    return extractDeepColumnName(object.expr);
  }
  if (object.column && typeof object.column === "object") {
    return extractDeepColumnName(object.column);
  }
  if (object.value !== undefined) {
    return String(object.value);
  }
  if (object.column !== undefined) {
    return String(object.column);
  }
  return String(object.name ?? object.tableName ?? "unknown");
}

function extractDeepColumnNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => extractDeepColumnName(item));
}

function normalizeType(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return String(object.dataType ?? object.type ?? object.name ?? "unknown").toLowerCase();
  }
  return String(value ?? "unknown").toLowerCase();
}

function hasPrimaryKey(def: AnyAst): boolean {
  if (def.primary_key) return true;
  if (def.constraint_type && isConstraintType(def.constraint_type, "PRIMARY KEY")) return true;
  return false;
}

function hasNotNull(def: AnyAst): boolean {
  if (!def.nullable) return false;
  if (typeof def.nullable === "object" && (def.nullable as AnyAst).type === "not null") return true;
  if (String(def.nullable) === "not null") return true;
  return false;
}

function isConstraintType(value: unknown, expected: string): boolean {
  if (typeof value !== "string") return false;
  return value.toUpperCase() === expected.toUpperCase();
}

function extractDefaultFromDef(def: AnyAst): string | undefined {
  if (!def.default_val) return undefined;
  const defaultVal = def.default_val as AnyAst;
  if (defaultVal.type === "default" && defaultVal.value) {
    if (typeof defaultVal.value === "object" && defaultVal.value !== null) {
      const val = defaultVal.value as AnyAst;
      if (val.type === "function" && val.name) {
        const name = val.name as AnyAst;
        const parts = Array.isArray(name.name) ? name.name as AnyAst[] : [];
        return parts.map((p) => String(p.value ?? "")).join("");
      }
      if (val.type === "single_quote_string") {
        return `'${String(val.value)}'`;
      }
      if (val.value !== undefined) return String(val.value);
    }
    return String(defaultVal.value);
  }
  if (typeof defaultVal.value === "string") return defaultVal.value;
  return String(defaultVal.value ?? "");
}
