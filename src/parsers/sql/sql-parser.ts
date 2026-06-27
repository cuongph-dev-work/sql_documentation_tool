import { Parser } from "node-sql-parser";
import type { DatabaseDialect, DatabaseDoc } from "../../core/model/database-doc";
import { createWarning } from "../../core/warnings";
import { normalizeSqlAst } from "./sql-normalizer";

export type ParseSqlSchemaOptions = {
  dialect?: DatabaseDialect;
};

export async function parseSqlSchema(sql: string, options: ParseSqlSchemaOptions = {}): Promise<DatabaseDoc> {
  const dialect = options.dialect ?? "unknown";
  const parser = new Parser();

  try {
    const ast = parser.astify(sql, { database: mapDialect(dialect) });
    return normalizeSqlAst(ast, dialect);
  } catch (error) {
    return {
      dialect,
      tables: [],
      relationships: [],
      indexes: [],
      warnings: [createWarning("UNSUPPORTED_SQL", error instanceof Error ? error.message : "Unsupported SQL syntax")]
    };
  }
}

function mapDialect(dialect: DatabaseDialect): "postgresql" | "mysql" | undefined {
  if (dialect === "postgres") return "postgresql";
  if (dialect === "mysql" || dialect === "mariadb") return "mysql";
  return undefined;
}
