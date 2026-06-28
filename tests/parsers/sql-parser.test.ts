import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseSqlSchema } from "../../src/parsers/sql/sql-parser";

describe("parseSqlSchema", () => {
  it("parses PostgreSQL tables, columns, primary keys, foreign keys, and indexes", async () => {
    const sql = await readFile("fixtures/postgres/basic-schema.sql", "utf8");
    const doc = await parseSqlSchema(sql, { dialect: "postgres" });

    expect(doc.tables.map((table) => table.name)).toEqual(["users", "orders"]);
    expect(
      doc.tables.find((table) => table.name === "users")?.primaryKeys
    ).toEqual(["id"]);
    expect(
      doc.tables.find((table) => table.name === "orders")?.foreignKeys[0]
    ).toMatchObject({
      columns: ["user_id"],
      referencedTable: "users",
      referencedColumns: ["id"]
    });
    expect(doc.indexes).toContainEqual({
      name: "idx_orders_status",
      table: "orders",
      columns: ["status"],
      unique: false
    });
  });

  it("keeps parser warnings instead of throwing for unsupported statements", async () => {
    const doc = await parseSqlSchema(
      "CREATE TRIGGER ignored_trigger BEFORE INSERT ON users FOR EACH ROW SELECT 1;",
      {
        dialect: "postgres"
      }
    );

    expect(doc.warnings[0]?.code).toBe("UNSUPPORTED_SQL");
  });
});
