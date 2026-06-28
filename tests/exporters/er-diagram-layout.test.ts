import { describe, expect, it } from "vitest";
import { layoutErDiagram, isCompactLayout } from "../../src/exporters/diagram/er-diagram-layout";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

function makeTable(name: string, refs: string[] = []) {
  return {
    name,
    columns: [
      {
        name: "id",
        type: "bigint",
        nullable: false,
        isPrimaryKey: true,
        isForeignKey: false
      },
      ...refs.map((ref) => ({
        name: `${ref}_id`,
        type: "bigint",
        nullable: false,
        isPrimaryKey: false,
        isForeignKey: true
      }))
    ],
    primaryKeys: ["id"],
    foreignKeys: refs.map((ref) => ({
      columns: [`${ref}_id`],
      referencedTable: ref,
      referencedColumns: ["id"]
    })),
    indexes: [],
    reviewTodos: []
  };
}

describe("layoutErDiagram", () => {
  it("uses compact layout for large schemas", () => {
    expect(isCompactLayout(17)).toBe(false);
    expect(isCompactLayout(18)).toBe(true);
  });

  it("places related tables with orthogonal edges", async () => {
    const doc: DatabaseDoc = {
      dialect: "mysql",
      tables: [makeTable("users"), makeTable("orders", ["users"]), makeTable("items", ["orders"])],
      relationships: [
        {
          fromTable: "orders",
          fromColumn: "users_id",
          toTable: "users",
          toColumn: "id",
          source: "schema",
          needsReview: false
        },
        {
          fromTable: "items",
          fromColumn: "orders_id",
          toTable: "orders",
          toColumn: "id",
          source: "schema",
          needsReview: false
        }
      ],
      indexes: [],
      warnings: []
    };

    const { boxes, edges } = await layoutErDiagram(doc);
    expect(boxes.size).toBe(3);
    expect(edges.length).toBeGreaterThanOrEqual(2);

    const users = boxes.get("users")!;
    const orders = boxes.get("orders")!;
    const items = boxes.get("items")!;

    // RIGHT layout (< 8 tables): child left of referenced parent
    expect(orders.x).toBeLessThan(users.x);
    expect(items.x).toBeLessThan(orders.x);

    for (const edge of edges) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
    }
  });
});
