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
    const email = doc.tables
      .find((table) => table.name === "users")
      ?.columns.find((column) => column.name === "email");
    expect(email).toMatchObject({
      type: "varchar(255)",
      size: "255",
      isUnique: true
    });
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

  it("parses MySQL auto_increment schema when dialect is mysql", async () => {
    const sql = `
      CREATE TABLE address_detail (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        address_street VARCHAR(128) NOT NULL
      );
    `;

    const doc = await parseSqlSchema(sql, { dialect: "mysql" });

    expect(doc.warnings).toEqual([]);
    expect(doc.tables.map((table) => table.name)).toEqual(["address_detail"]);
    expect(doc.tables[0]?.columns.map((column) => column.name)).toEqual([
      "id",
      "address_street"
    ]);
    expect(doc.tables[0]?.columns[0]).toMatchObject({
      type: "bigint",
      isPrimaryKey: true,
      constraintNotes: ["AUTO_INCREMENT"]
    });
    expect(doc.tables[0]?.columns[1]).toMatchObject({
      type: "varchar(128)",
      size: "128"
    });
  });

  it("auto-detects MySQL dialect when none is provided", async () => {
    const sql = `
      CREATE TABLE address_detail (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        address_street VARCHAR(128) NOT NULL
      );
    `;

    const doc = await parseSqlSchema(sql);

    expect(doc.dialect).toBe("mysql");
    expect(doc.warnings.map((warning) => warning.code)).toContain(
      "DIALECT_AUTO_DETECTED"
    );
    expect(doc.tables.map((table) => table.name)).toEqual(["address_detail"]);
  });

  it("falls back to another dialect when the requested dialect fails", async () => {
    const sql = `
      CREATE TABLE address_detail (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        address_street VARCHAR(128) NOT NULL
      );
    `;

    const doc = await parseSqlSchema(sql, { dialect: "postgres" });

    expect(doc.dialect).toBe("mysql");
    expect(doc.warnings.map((warning) => warning.code)).toContain(
      "DIALECT_FALLBACK"
    );
    expect(doc.tables.map((table) => table.name)).toEqual(["address_detail"]);
  });
});
