import { describe, expect, it } from "vitest";
import { databaseDocSchema } from "../../src/core/model/validation";

describe("databaseDocSchema", () => {
  it("accepts a valid database document", () => {
    const result = databaseDocSchema.safeParse({
      dialect: "postgres",
      tables: [
        {
          name: "users",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              isUnique: false
            }
          ],
          primaryKeys: ["id"],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    });

    expect(result.success).toBe(true);
  });

  it("rejects AI descriptions without confidence", () => {
    const result = databaseDocSchema.safeParse({
      dialect: "postgres",
      tables: [
        {
          name: "orders",
          description: {
            value: "Stores orders.",
            source: "ai",
            needsReview: true
          },
          columns: [],
          primaryKeys: [],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    });

    expect(result.success).toBe(false);
  });
});
