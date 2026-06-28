import nodeSqlParser from "node-sql-parser";

const { Parser } = nodeSqlParser;
import type {
  DatabaseDialect,
  DatabaseDoc
} from "../../core/model/database-doc";
import { createWarning } from "../../core/warnings";
import { normalizeSqlAst } from "./sql-normalizer";

export type ParseSqlSchemaOptions = {
  dialect?: DatabaseDialect;
};

export async function parseSqlSchema(
  sql: string,
  options: ParseSqlSchemaOptions = {}
): Promise<DatabaseDoc> {
  const requestedDialect = options.dialect;
  const parser = new Parser();
  const detectedDialect = detectDialect(sql);
  const attempts = buildDialectAttempts(requestedDialect, detectedDialect);
  const failures: Array<{ dialect: DatabaseDialect; message: string }> = [];
  const successes: Array<{
    dialect: DatabaseDialect;
    doc: DatabaseDoc;
    score: number;
  }> = [];

  for (const dialect of attempts) {
    try {
      const ast = parser.astify(sql, buildAstifyOptions(dialect));
      const doc = normalizeSqlAst(ast, dialect);
      successes.push({
        dialect,
        doc,
        score: scoreParsedDoc(doc)
      });
    } catch (error) {
      failures.push({
        dialect,
        message: error instanceof Error ? error.message : "Unsupported SQL syntax"
      });
    }
  }

  const best = pickBestResult(successes, requestedDialect, detectedDialect);
  if (best) {
    if (!requestedDialect && best.dialect !== "unknown") {
      best.doc.warnings.unshift(
        createWarning(
          "DIALECT_AUTO_DETECTED",
          `SQL dialect auto-detected as "${best.dialect}".`
        )
      );
    } else if (requestedDialect && requestedDialect !== best.dialect) {
      best.doc.warnings.unshift(
        createWarning(
          "DIALECT_FALLBACK",
          `Requested dialect "${requestedDialect}" produced a lower-quality parse, reparsed successfully as "${best.dialect}".`
        )
      );
    }

    return best.doc;
  }

  return {
    dialect: requestedDialect ?? "unknown",
    tables: [],
    relationships: [],
    indexes: [],
    warnings: [
      createWarning(
        "UNSUPPORTED_SQL",
        failures[0]?.message ?? "Unsupported SQL syntax"
      )
    ]
  };
}

function mapDialect(
  dialect?: DatabaseDialect
): "postgresql" | "mysql" | undefined {
  if (dialect === "postgres") return "postgresql";
  if (dialect === "mysql" || dialect === "mariadb") return "mysql";
  return undefined;
}

function buildAstifyOptions(
  dialect?: DatabaseDialect
): { database: "postgresql" | "mysql" } | undefined {
  const database = mapDialect(dialect);
  return database ? { database } : undefined;
}

function buildDialectAttempts(
  requestedDialect?: DatabaseDialect,
  detectedDialect?: DatabaseDialect
): DatabaseDialect[] {
  const attempts: DatabaseDialect[] = [];

  if (requestedDialect) {
    attempts.push(requestedDialect);
  }

  if (detectedDialect) {
    attempts.push(detectedDialect);
  }

  attempts.push("mysql", "mariadb", "postgres", "unknown");
  return dedupeDialects(attempts);
}

function dedupeDialects(dialects: DatabaseDialect[]): DatabaseDialect[] {
  const seen = new Set<DatabaseDialect>();
  const ordered: DatabaseDialect[] = [];

  for (const dialect of dialects) {
    if (seen.has(dialect)) continue;
    seen.add(dialect);
    ordered.push(dialect);
  }

  return ordered;
}

function detectDialect(sql: string): DatabaseDialect | undefined {
  const source = sql.toUpperCase();

  const mysqlSignals = [
    "AUTO_INCREMENT",
    "ENGINE=",
    "TINYINT",
    "UNSIGNED",
    "ZEROFILL",
    "CHARACTER SET",
    "COLLATE "
  ];

  if (mysqlSignals.some((signal) => source.includes(signal))) {
    return "mysql";
  }

  const postgresSignals = [
    "SERIAL",
    "BIGSERIAL",
    "GENERATED ALWAYS AS IDENTITY",
    "JSONB",
    "ILIKE",
    "CREATE EXTENSION"
  ];

  if (postgresSignals.some((signal) => source.includes(signal))) {
    return "postgres";
  }

  return undefined;
}

function pickBestResult(
  successes: Array<{ dialect: DatabaseDialect; doc: DatabaseDoc; score: number }>,
  requestedDialect?: DatabaseDialect,
  detectedDialect?: DatabaseDialect
): { dialect: DatabaseDialect; doc: DatabaseDoc; score: number } | undefined {
  const ranked = [...successes].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;

    const leftBias = dialectBias(left.dialect, requestedDialect, detectedDialect);
    const rightBias = dialectBias(
      right.dialect,
      requestedDialect,
      detectedDialect
    );

    return rightBias - leftBias;
  });

  return ranked[0];
}

function scoreParsedDoc(doc: DatabaseDoc): number {
  let score = 0;

  score += doc.tables.length * 100;
  score += doc.indexes.length * 15;
  score += doc.relationships.length * 20;
  score -= doc.warnings.length * 25;

  for (const table of doc.tables) {
    score += table.columns.length * 10;
    score += table.primaryKeys.length * 5;

    for (const column of table.columns) {
      if (column.name && column.name !== "unknown") score += 3;
      if (column.type && column.type !== "unknown") score += 2;
      if (column.name.includes("[object Object]")) score -= 50;
      if (column.type.includes("[object Object]")) score -= 30;
    }
  }

  return score;
}

function dialectBias(
  dialect: DatabaseDialect,
  requestedDialect?: DatabaseDialect,
  detectedDialect?: DatabaseDialect
): number {
  let bias = 0;

  if (detectedDialect && dialect === detectedDialect) bias += 20;
  if (requestedDialect && dialect === requestedDialect) bias += 5;
  if (dialect === "unknown") bias -= 10;

  return bias;
}
