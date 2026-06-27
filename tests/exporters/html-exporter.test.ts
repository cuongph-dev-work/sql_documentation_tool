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

describe("exportHtmlDocs", () => {
  it("writes html/index.html and html/tables/users.html", async () => {
    const { exportHtmlDocs } = await import(
      "../../src/exporters/html/html-exporter"
    );
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportHtmlDocs(doc, { outDir: dir });

    await expect(stat(join(dir, "html", "index.html"))).resolves.toMatchObject(
      {
        size: expect.any(Number),
      },
    );
    await expect(
      stat(join(dir, "html", "tables", "users.html")),
    ).resolves.toMatchObject({
      size: expect.any(Number),
    });

    await rm(dir, { recursive: true, force: true });
  });
});
