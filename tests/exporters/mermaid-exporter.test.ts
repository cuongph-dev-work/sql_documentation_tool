import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exportMermaidDiagram } from "../../src/exporters/diagram/mermaid-exporter";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

describe("exportMermaidDiagram", () => {
  it("writes schema-derived ERD only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
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

    await exportMermaidDiagram(doc, { outDir: dir });
    const content = await readFile(join(dir, "er_diagram.mmd"), "utf8");

    expect(content).toContain("erDiagram");
    expect(content).toContain("users");
    await rm(dir, { recursive: true, force: true });
  });
});
