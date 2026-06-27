import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportExcelDictionary } from "../../src/exporters/excel/excel-exporter";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

const doc: DatabaseDoc = {
  dialect: "postgres",
  tables: [
    {
      name: "users",
      columns: [{ name: "id", type: "integer", nullable: false, isPrimaryKey: true, isForeignKey: false }],
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

describe("exportExcelDictionary", () => {
  it("writes database_dictionary.xlsx", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportExcelDictionary(doc, { outDir: dir });

    await expect(stat(join(dir, "database_dictionary.xlsx"))).resolves.toMatchObject({ size: expect.any(Number) });
    await rm(dir, { recursive: true, force: true });
  });
});
