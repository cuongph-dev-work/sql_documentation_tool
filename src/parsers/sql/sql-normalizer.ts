import type {
  DatabaseDialect,
  DatabaseDoc,
  IndexDoc,
  RelationshipDoc,
  TableDoc,
  WarningDoc
} from "../../core/model/database-doc";
import {
  extractCheckBounds,
  extractColumnComment,
  extractConstraintColumnNames,
  hasColumnUnique,
  normalizeColumnType,
  stringifyCheckDefinition
} from "./column-meta";

type AnyAst = Record<string, unknown>;

export function normalizeSqlAst(
  ast: unknown,
  dialect: DatabaseDialect
): DatabaseDoc {
  const statements = Array.isArray(ast) ? ast : [ast];
  const tables: TableDoc[] = [];
  const indexes: IndexDoc[] = [];
  const relationships: RelationshipDoc[] = [];
  const warnings: WarningDoc[] = [];

  for (const statement of statements as AnyAst[]) {
    if (statement.type === "create" && statement.keyword === "table") {
      const table = normalizeCreateTable(statement);
      tables.push(table);
      const result = relationshipsFromTable(table);
      relationships.push(...result.relationships);
      warnings.push(...result.warnings);
    }

    if (statement.type === "create" && statement.keyword === "index") {
      indexes.push(normalizeCreateIndex(statement));
    }
  }

  for (const index of indexes) {
    const table = tables.find((candidate) => candidate.name === index.table);
    if (!table) continue;
    table.indexes.push(index);
    if (index.unique) {
      markColumnsUnique(table, index.columns, `INDEX ${index.name}`);
    }
  }

  return {
    dialect,
    tables,
    relationships,
    indexes,
    warnings
  };
}

function normalizeCreateTable(statement: AnyAst): TableDoc {
  const tableName = extractTableName(statement.table);
  const createDefinitions = Array.isArray(statement.create_definitions)
    ? (statement.create_definitions as AnyAst[])
    : [];

  const table: TableDoc = {
    name: tableName,
    columns: [],
    primaryKeys: [],
    foreignKeys: [],
    indexes: [],
    reviewTodos: []
  };

  for (const definition of createDefinitions) {
    if (definition.resource !== "column") continue;

    const columnName = extractDeepColumnName(definition.column);
    const isPrimaryKey = hasPrimaryKey(definition);
    const isNotNull = hasNotNull(definition);
    const { type, size } = normalizeColumnType(definition.definition);
    const check = definition.check as AnyAst | undefined;
    const bounds = check?.definition
      ? extractCheckBounds(check.definition, columnName)
      : {};

    const constraintNotes: string[] = [];
    if (check?.definition) {
      const expression = stringifyCheckDefinition(check.definition);
      if (expression && (!bounds.minValue || !bounds.maxValue)) {
        constraintNotes.push(`CHECK: ${expression}`);
      }
    }

    table.columns.push({
      name: columnName,
      type,
      size,
      nullable: !isNotNull && !isPrimaryKey,
      defaultValue: extractDefaultFromDef(definition),
      minValue: bounds.minValue,
      maxValue: bounds.maxValue,
      isUnique: hasColumnUnique(definition),
      isPrimaryKey,
      isForeignKey: false,
      comment: extractColumnComment(definition),
      constraintNotes: constraintNotes.length > 0 ? constraintNotes : undefined
    });
    if (isPrimaryKey) table.primaryKeys.push(columnName);
  }

  for (const definition of createDefinitions) {
    if (definition.resource !== "constraint") continue;

    if (isConstraintType(definition.constraint_type, "PRIMARY KEY")) {
      table.primaryKeys = extractDeepColumnNames(definition.definition);
      for (const column of table.columns) {
        if (table.primaryKeys.includes(column.name)) column.isPrimaryKey = true;
      }
    }

    if (isConstraintType(definition.constraint_type, "FOREIGN KEY")) {
      const columns = extractDeepColumnNames(definition.definition);
      const refDef = definition.reference_definition as AnyAst | undefined;
      const referencedTable = extractTableName(refDef?.table);
      const referencedColumns = extractDeepColumnNames(refDef?.definition);
      table.foreignKeys.push({
        name:
          typeof definition.constraint === "string"
            ? definition.constraint
            : undefined,
        columns,
        referencedTable,
        referencedColumns
      });
      for (const column of table.columns) {
        if (columns.includes(column.name)) column.isForeignKey = true;
      }
    }

    if (isConstraintType(definition.constraint_type, "UNIQUE")) {
      const columns = extractConstraintColumnNames(definition.definition);
      const label =
        typeof definition.constraint === "string"
          ? definition.constraint
          : "UNIQUE";
      markColumnsUnique(table, columns, label);
    }

    if (isConstraintType(definition.constraint_type, "CHECK")) {
      applyTableCheckConstraint(table, definition);
    }
  }

  return table;
}

function markColumnsUnique(
  table: TableDoc,
  columns: string[],
  label: string
): void {
  const composite = columns.length > 1;
  for (const columnName of columns) {
    const column = table.columns.find((item) => item.name === columnName);
    if (!column) continue;
    column.isUnique = true;
    if (composite) {
      addConstraintNote(
        column,
        `UNIQUE (${label}: ${columns.join(", ")})`
      );
    }
  }
}

function applyTableCheckConstraint(table: TableDoc, definition: AnyAst): void {
  const expression = stringifyCheckDefinition(definition.definition);
  if (!expression) return;

  const referencedColumns = new Set<string>();
  for (const column of table.columns) {
    const bounds = extractCheckBounds(definition.definition, column.name);
    if (bounds.minValue) column.minValue = bounds.minValue;
    if (bounds.maxValue) column.maxValue = bounds.maxValue;
    if (bounds.minValue || bounds.maxValue) {
      referencedColumns.add(column.name);
      continue;
    }
    if (expression.includes(column.name)) {
      referencedColumns.add(column.name);
    }
  }

  if (referencedColumns.size === 0) {
    for (const column of table.columns) {
      addConstraintNote(column, `CHECK: ${expression}`);
    }
    return;
  }

  for (const columnName of referencedColumns) {
    const column = table.columns.find((item) => item.name === columnName);
    if (!column) continue;
    if (!column.minValue && !column.maxValue) {
      addConstraintNote(column, `CHECK: ${expression}`);
    }
  }
}

function addConstraintNote(
  column: TableDoc["columns"][number],
  note: string
): void {
  const notes = column.constraintNotes ?? [];
  if (!notes.includes(note)) notes.push(note);
  column.constraintNotes = notes;
}

function normalizeCreateIndex(statement: AnyAst): IndexDoc {
  return {
    name: String(statement.index ?? statement.index_name ?? "unnamed_index"),
    table: extractTableName(statement.table),
    columns: extractDeepColumnNames(
      statement.index_columns ?? statement.columns
    ),
    unique: Boolean(statement.unique)
  };
}

function relationshipsFromTable(table: TableDoc): {
  relationships: RelationshipDoc[];
  warnings: WarningDoc[];
} {
  const relationships: RelationshipDoc[] = [];
  const warnings: WarningDoc[] = [];

  for (const foreignKey of table.foreignKeys) {
    for (let index = 0; index < foreignKey.columns.length; index++) {
      const column = foreignKey.columns[index];
      let toColumn: string;
      let needsReview = false;

      if (foreignKey.referencedColumns[index]) {
        toColumn = foreignKey.referencedColumns[index];
      } else {
        toColumn = foreignKey.referencedColumns[0] ?? column;
        needsReview = true;

        table.reviewTodos.push({
          type: "relationship",
          target: `${table.name}.${column} → ${foreignKey.referencedTable}`,
          issue: `Foreign key column "${column}" references table "${foreignKey.referencedTable}" but the referenced column at position ${index} is missing from the schema. Using "${toColumn}" as a best-guess fallback.`,
          suggestion: `Verify the referenced column name in table "${foreignKey.referencedTable}" and update manually.`,
          source: "schema"
        });

        warnings.push({
          code: "FK_REFERENCED_COLUMN_GUESS",
          message: `In table "${table.name}", foreign key column "${column}" references "${foreignKey.referencedTable}" but the referenced column at index ${index} is missing. Falling back to "${toColumn}".`,
          target: `${table.name}.${column}`,
          severity: "warning"
        });
      }

      relationships.push({
        fromTable: table.name,
        fromColumn: column,
        toTable: foreignKey.referencedTable,
        toColumn,
        constraintName: foreignKey.name,
        source: "schema" as const,
        needsReview
      });
    }
  }

  return { relationships, warnings };
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
  if (typeof value !== "object" || value === null)
    return String(value ?? "unknown");
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

function hasPrimaryKey(def: AnyAst): boolean {
  if (def.primary_key) return true;
  if (
    def.constraint_type &&
    isConstraintType(def.constraint_type, "PRIMARY KEY")
  )
    return true;
  return false;
}

function hasNotNull(def: AnyAst): boolean {
  if (!def.nullable) return false;
  if (
    typeof def.nullable === "object" &&
    (def.nullable as AnyAst).type === "not null"
  )
    return true;
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
        const parts = Array.isArray(name.name) ? (name.name as AnyAst[]) : [];
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
  return undefined;
}
