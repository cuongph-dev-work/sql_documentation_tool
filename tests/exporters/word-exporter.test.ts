import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

const doc: DatabaseDoc = {
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
        },
      ],
      primaryKeys: ["id"],
      foreignKeys: [],
      indexes: [],
      reviewTodos: [],
    },
  ],
  relationships: [],
  indexes: [],
  warnings: [],
};

describe("exportWordDocument", () => {
  it("writes database_document.docx with non-zero size", async () => {
    const { exportWordDocument } = await import(
      "../../src/exporters/word/word-exporter"
    );
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportWordDocument(doc, { outDir: dir });

    const fileStat = await stat(
      join(dir, "database_document.docx"),
    );
    expect(fileStat.size).toBeGreaterThan(0);

    await rm(dir, { recursive: true, force: true });
  });
});
