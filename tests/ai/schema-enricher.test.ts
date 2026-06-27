import { describe, expect, it } from "vitest";
import type { DatabaseDoc, TableDoc } from "../../src/core/model/database-doc";

function makeFakeProvider(response: string) {
  return (_config: unknown, _options: unknown) => Promise.resolve(response);
}

function makeFakeProviderThrows(error: Error) {
  return (_config: unknown, _options: unknown) => Promise.reject(error);
}

function makeFakeProviderFetch(returnedTable: string, extra: Record<string, unknown> = {}) {
  const response = {
    table: returnedTable,
    purpose: "AI-inferred purpose for this table.",
    confidence: "high",
    columnDescriptions: {
      id: {
        description: "Auto-increment primary key.",
        source: "ai",
        confidence: "high",
        needsReview: false
      },
      name: {
        description: "Display name of the entity.",
        source: "ai",
        confidence: "medium",
        needsReview: true
      }
    },
    reviewTodos: ["Verify purpose of the name column."],
    ...extra
  };
  return (_config: unknown, _options: unknown) => Promise.resolve(JSON.stringify(response));
}

describe("schema-enricher", () => {
  // We'll import the real enrichDatabaseDoc once the module exists.
  // For now, this test file imports the function from the module path
  // that will be created in Step 4.

  it("enrichment adds descriptions to a table via a fake provider", async () => {
    // Dynamic import to avoid compile errors before the module exists.
    // We need to re-import inside the test after writing the module.
    const { enrichDatabaseDoc } = await import("../../src/ai/enrichers/schema-enricher");

    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "users",
          comment: "User accounts",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              defaultValue: "nextval('users_id_seq')",
              comment: "Primary key"
            },
            {
              name: "name",
              type: "varchar(255)",
              nullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
              comment: "Full name"
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
    };

    const provider = makeFakeProviderFetch("users");
    const providerConfig = {
      apiKey: "test-key",
      model: "test-model"
    };

    const result = await enrichDatabaseDoc({
      doc,
      providerConfig,
      rules: { "system.md": "You are a helpful DB documenter.", "table-enrich.md": "Describe the table.", "column-enrich.md": "Describe columns." },
      provider: provider as unknown as typeof import("../../src/ai/providers/openai-compatible").callAiProvider
    });

    expect(result.tables).toHaveLength(1);
    const table = result.tables[0];

    // Description should be enriched
    expect(table.description).toBeDefined();
    expect(table.description?.value).toBe("AI-inferred purpose for this table.");
    expect(table.description?.source).toBe("ai");
    expect(table.description?.confidence).toBe("high");

    // Column descriptions should be enriched
    const idColumn = table.columns.find((c) => c.name === "id");
    expect(idColumn?.description?.value).toBe("Auto-increment primary key.");
    expect(idColumn?.description?.source).toBe("ai");
    expect(idColumn?.description?.confidence).toBe("high");
    expect(idColumn?.description?.needsReview).toBe(false);

    const nameColumn = table.columns.find((c) => c.name === "name");
    expect(nameColumn?.description?.value).toBe("Display name of the entity.");
    expect(nameColumn?.description?.confidence).toBe("medium");
    expect(nameColumn?.description?.needsReview).toBe(true);

    // Review todos should be added
    expect(table.reviewTodos).toHaveLength(1);
    expect(table.reviewTodos[0].issue).toBe("Verify purpose of the name column.");
    expect(table.reviewTodos[0].type).toBe("ai");
    expect(table.reviewTodos[0].source).toBe("ai");
  });

  it("never modifies DB facts (name, type, nullable, PK, FK, default, index)", async () => {
    const { enrichDatabaseDoc } = await import("../../src/ai/enrichers/schema-enricher");

    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "orders",
          comment: "Customer orders",
          columns: [
            {
              name: "id",
              type: "uuid",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              defaultValue: "gen_random_uuid()",
              comment: "Order ID"
            },
            {
              name: "total",
              type: "decimal(10,2)",
              nullable: false,
              isPrimaryKey: false,
              isForeignKey: false
            }
          ],
          primaryKeys: ["id"],
          foreignKeys: [
            { name: "fk_orders_user", columns: ["user_id"], referencedTable: "users", referencedColumns: ["id"] }
          ],
          indexes: [
            { name: "idx_orders_created_at", table: "orders", columns: ["created_at"], unique: false }
          ],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    };

    const provider = makeFakeProviderFetch("orders", {
      confidence: "medium",
      columnDescriptions: {
        id: {
          description: "Guessed description.",
          source: "ai",
          confidence: "low",
          needsReview: true
        }
      }
    });

    const providerConfig = {
      apiKey: "test-key",
      model: "test-model"
    };

    const result = await enrichDatabaseDoc({
      doc,
      providerConfig,
      rules: { "system.md": "", "table-enrich.md": "", "column-enrich.md": "" },
      provider: provider as unknown as typeof import("../../src/ai/providers/openai-compatible").callAiProvider
    });

    expect(result.tables).toHaveLength(1);
    const table = result.tables[0];

    // Check all DB facts remain unchanged
    expect(table.name).toBe("orders");
    expect(table.comment).toBe("Customer orders");
    expect(table.primaryKeys).toEqual(["id"]);
    expect(table.foreignKeys).toHaveLength(1);
    expect(table.foreignKeys[0].name).toBe("fk_orders_user");
    expect(table.indexes).toHaveLength(1);
    expect(table.indexes[0].name).toBe("idx_orders_created_at");

    const idColumn = table.columns.find((c) => c.name === "id");
    expect(idColumn?.name).toBe("id");
    expect(idColumn?.type).toBe("uuid");
    expect(idColumn?.nullable).toBe(false);
    expect(idColumn?.isPrimaryKey).toBe(true);
    expect(idColumn?.isForeignKey).toBe(false);
    expect(idColumn?.defaultValue).toBe("gen_random_uuid()");

    // But description IS added (AI enriches, doesn't modify)
    expect(idColumn?.description).toBeDefined();
    expect(idColumn?.description?.value).toBe("Guessed description.");

    const totalColumn = table.columns.find((c) => c.name === "total");
    expect(totalColumn?.name).toBe("total");
    expect(totalColumn?.type).toBe("decimal(10,2)");
    expect(totalColumn?.nullable).toBe(false);
    expect(totalColumn?.isPrimaryKey).toBe(false);
    expect(totalColumn?.isForeignKey).toBe(false);
    expect(totalColumn?.defaultValue).toBeUndefined();
  });

  it("invalid AI JSON returns a warning and does not crash", async () => {
    const { enrichDatabaseDoc } = await import("../../src/ai/enrichers/schema-enricher");

    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "products",
          comment: "Product catalog",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              comment: "ID"
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
    };

    // Provider returns invalid JSON
    const provider = makeFakeProvider("not valid json {{{");

    const providerConfig = {
      apiKey: "test-key",
      model: "test-model"
    };

    const result = await enrichDatabaseDoc({
      doc,
      providerConfig,
      rules: { "system.md": "", "table-enrich.md": "", "column-enrich.md": "" },
      provider: provider as unknown as typeof import("../../src/ai/providers/openai-compatible").callAiProvider
    });

    // Should not crash
    expect(result.tables).toHaveLength(1);
    const table = result.tables[0];

    // Table facts preserved
    expect(table.name).toBe("products");
    expect(table.comment).toBe("Product catalog");

    // Should have a warning
    const warnings = result.warnings.filter((w) => w.code === "AI_ENRICH_FAILED");
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0].message).toContain("products");
  });

  it("API error returns a warning and does not crash", async () => {
    const { enrichDatabaseDoc } = await import("../../src/ai/enrichers/schema-enricher");

    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "categories",
          comment: "Product categories",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              comment: "ID"
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
    };

    const provider = makeFakeProviderThrows(new Error("Network error"));

    const providerConfig = {
      apiKey: "test-key",
      model: "test-model"
    };

    const result = await enrichDatabaseDoc({
      doc,
      providerConfig,
      rules: { "system.md": "", "table-enrich.md": "", "column-enrich.md": "" },
      provider: provider as unknown as typeof import("../../src/ai/providers/openai-compatible").callAiProvider
    });

    // Should not crash
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].name).toBe("categories");

    // Should have a warning about the error
    const warnings = result.warnings.filter((w) => w.code === "AI_ENRICH_FAILED");
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0].message).toContain("categories");
    expect(warnings[0].message).toContain("Network error");
  });

  it("high confidence sets needsReview to false, low confidence sets it to true", async () => {
    const { enrichDatabaseDoc } = await import("../../src/ai/enrichers/schema-enricher");

    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "logs",
          comment: "",
          columns: [
            {
              name: "id",
              type: "integer",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false
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
    };

    const provider = makeFakeProviderFetch("logs", {
      purpose: "Activity logs.",
      confidence: "low",
      columnDescriptions: {
        id: {
          description: "Log entry ID.",
          source: "ai",
          confidence: "high",
          needsReview: false
        }
      }
    });

    const providerConfig = {
      apiKey: "test-key",
      model: "test-model"
    };

    const result = await enrichDatabaseDoc({
      doc,
      providerConfig,
      rules: { "system.md": "", "table-enrich.md": "", "column-enrich.md": "" },
      provider: provider as unknown as typeof import("../../src/ai/providers/openai-compatible").callAiProvider
    });

    const table = result.tables[0];

    // Table-level: low confidence -> needsReview true
    expect(table.description?.confidence).toBe("low");
    expect(table.description?.needsReview).toBe(true);

    // Column-level: high confidence -> needsReview false
    const idColumn = table.columns.find((c) => c.name === "id");
    expect(idColumn?.description?.confidence).toBe("high");
    expect(idColumn?.description?.needsReview).toBe(false);
  });

  it("handles missing columnDescriptions gracefully", async () => {
    const { enrichDatabaseDoc } = await import("../../src/ai/enrichers/schema-enricher");

    const doc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "settings",
          comment: "",
          columns: [
            {
              name: "key",
              type: "varchar(255)",
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false
            }
          ],
          primaryKeys: ["key"],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    };

    const provider = makeFakeProviderFetch("settings", {
      purpose: "Key-value settings store.",
      confidence: "high",
      columnDescriptions: undefined
    });

    const providerConfig = {
      apiKey: "test-key",
      model: "test-model"
    };

    const result = await enrichDatabaseDoc({
      doc,
      providerConfig,
      rules: { "system.md": "", "table-enrich.md": "", "column-enrich.md": "" },
      provider: provider as unknown as typeof import("../../src/ai/providers/openai-compatible").callAiProvider
    });

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].description?.value).toBe("Key-value settings store.");
    expect(result.warnings).toHaveLength(0);
  });
});
