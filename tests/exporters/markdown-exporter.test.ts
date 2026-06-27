import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
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
        {
          name: "email",
          type: "varchar",
          nullable: false,
          isPrimaryKey: false,
          isForeignKey: false,
          comment: "user email address",
        },
      ],
      primaryKeys: ["id"],
      foreignKeys: [],
      indexes: [
        {
          name: "idx_users_email",
          table: "users",
          columns: ["email"],
          unique: true,
        },
      ],
      reviewTodos: [],
    },
  ],
  relationships: [],
  indexes: [],
  warnings: [],
};

describe("exportMarkdownDocs", () => {
  it("writes DATABASE.md and tables/users.md with content", async () => {
    const { exportMarkdownDocs } = await import(
      "../../src/exporters/markdown/markdown-exporter"
    );
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportMarkdownDocs(doc, { outDir: dir });

    await expect(stat(join(dir, "DATABASE.md"))).resolves.toMatchObject({
      size: expect.any(Number),
    });
    await expect(stat(join(dir, "tables", "users.md"))).resolves.toMatchObject(
      {
        size: expect.any(Number),
      },
    );

    const overviewContent = await readFile(join(dir, "DATABASE.md"), "utf8");
    expect(overviewContent).toContain("users");

    await rm(dir, { recursive: true, force: true });
  });
});
