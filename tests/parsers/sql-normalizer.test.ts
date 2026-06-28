import { describe, expect, it } from "vitest";
import { normalizeSqlAst } from "../../src/parsers/sql/sql-normalizer";

describe("normalizeSqlAst", () => {
  it("normalizes a minimal table AST with one column and no constraints", () => {
    const ast = [
      {
        type: "create",
        keyword: "table",
        table: [{ db: null, table: "users" }],
        create_definitions: [
          {
            column: {
              expr: { type: "column_ref", table: null, column: "id" },
              as: null
            },
            definition: { dataType: "SERIAL" },
            resource: "column"
          }
        ]
      }
    ];

    const doc = normalizeSqlAst(ast, "postgres");

    expect(doc.tables).toHaveLength(1);
    expect(doc.tables[0].name).toBe("users");
    expect(doc.tables[0].columns).toHaveLength(1);
    expect(doc.tables[0].columns[0]).toMatchObject({
      name: "id",
      type: "serial",
      nullable: true,
      isPrimaryKey: false,
      isForeignKey: false
    });
    expect(doc.tables[0].primaryKeys).toEqual([]);
    expect(doc.tables[0].foreignKeys).toEqual([]);
    expect(doc.relationships).toEqual([]);
    expect(doc.indexes).toEqual([]);
    expect(doc.warnings).toEqual([]);
  });

  it("normalizes a CREATE INDEX AST as a separate statement", () => {
    const ast = [
      {
        type: "create",
        keyword: "index",
        index_using: { keyword: "using", type: "btree" },
        index: "idx_orders_status",
        table: [{ db: null, table: "orders" }],
        on_kw: "on",
        index_columns: [{ type: "column_ref", table: null, column: "status" }],
        index_type: null
      }
    ];

    const doc = normalizeSqlAst(ast, "postgres");

    expect(doc.indexes).toHaveLength(1);
    expect(doc.indexes[0]).toMatchObject({
      name: "idx_orders_status",
      table: "orders",
      columns: ["status"],
      unique: false
    });
    expect(doc.tables).toEqual([]);
    expect(doc.relationships).toEqual([]);
    expect(doc.warnings).toEqual([]);
  });

  it("handles an empty statements array gracefully", () => {
    const doc = normalizeSqlAst([], "mysql");

    expect(doc).toEqual({
      dialect: "mysql",
      tables: [],
      relationships: [],
      indexes: [],
      warnings: []
    });
  });

  it("adds warnings and reviewTodos when foreign key referenced columns are incomplete", () => {
    const ast = [
      {
        type: "create",
        keyword: "table",
        table: [{ db: null, table: "orders" }],
        create_definitions: [
          {
            column: {
              expr: { type: "column_ref", table: null, column: "id" },
              as: null
            },
            definition: { dataType: "INT" },
            resource: "column"
          },
          {
            column: {
              expr: { type: "column_ref", table: null, column: "store_id" },
              as: null
            },
            definition: { dataType: "INT" },
            resource: "column"
          },
          {
            constraint: "fk_orders_store",
            definition: [
              {
                expr: { type: "column_ref", table: null, column: "store_id" },
                as: null
              }
            ],
            constraint_type: "FOREIGN KEY",
            resource: "constraint",
            reference_definition: {
              table: [{ db: null, table: "stores" }],
              definition: [
                {
                  expr: { type: "column_ref", table: null, column: "id" },
                  as: null
                }
              ]
            }
          }
        ]
      }
    ];

    const doc = normalizeSqlAst(ast, "postgres");

    expect(doc.tables).toHaveLength(1);
    const table = doc.tables[0];
    expect(table.foreignKeys).toHaveLength(1);
    expect(table.foreignKeys[0]).toMatchObject({
      columns: ["store_id"],
      referencedTable: "stores",
      referencedColumns: ["id"]
    });

    expect(doc.relationships).toHaveLength(1);
    expect(doc.relationships[0]).toMatchObject({
      fromTable: "orders",
      fromColumn: "store_id",
      toTable: "stores",
      toColumn: "id",
      source: "schema",
      needsReview: false
    });

    expect(table.reviewTodos).toEqual([]);
    expect(doc.warnings).toEqual([]);
  });

  it("does not return empty string for absent defaults", () => {
    const ast = [
      {
        type: "create",
        keyword: "table",
        table: [{ db: null, table: "users" }],
        create_definitions: [
          {
            column: {
              expr: { type: "column_ref", table: null, column: "name" },
              as: null
            },
            definition: { dataType: "VARCHAR", length: 255 },
            resource: "column"
          }
        ]
      }
    ];

    const doc = normalizeSqlAst(ast, "postgres");

    expect(doc.tables[0].columns[0].defaultValue).toBeUndefined();
  });
});
