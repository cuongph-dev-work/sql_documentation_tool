import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseDoc } from "../../src/core/model/database-doc";
import { sanitizeFilename } from "../../src/core/sanitize";

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
          isForeignKey: false
        },
        {
          name: "email",
          type: "varchar",
          nullable: false,
          isPrimaryKey: false,
          isForeignKey: false,
          comment: "user email address"
        }
      ],
      primaryKeys: ["id"],
      foreignKeys: [],
      indexes: [
        {
          name: "idx_users_email",
          table: "users",
          columns: ["email"],
          unique: true
        }
      ],
      reviewTodos: []
    }
  ],
  relationships: [],
  indexes: [],
  warnings: []
};

describe("exportMarkdownDocs", () => {
  it("writes DATABASE.md and tables/users.md with content", async () => {
    const { exportMarkdownDocs } =
      await import("../../src/exporters/markdown/markdown-exporter");
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportMarkdownDocs(doc, { outDir: dir });

    await expect(stat(join(dir, "DATABASE.md"))).resolves.toMatchObject({
      size: expect.any(Number)
    });
    await expect(stat(join(dir, "tables", "users.md"))).resolves.toMatchObject({
      size: expect.any(Number)
    });

    const overviewContent = await readFile(join(dir, "DATABASE.md"), "utf8");
    expect(overviewContent).toContain("users");

    // Content validation: column names
    const tableContent = await readFile(
      join(dir, "tables", "users.md"),
      "utf8"
    );
    expect(tableContent).toContain("id");
    expect(tableContent).toContain("email");
    expect(tableContent).toContain("user email address");

    // Content validation: markdown table header
    expect(tableContent).toContain(
      "| Name | Type | Nullable | Default | PK | FK | Comment |"
    );

    await rm(dir, { recursive: true, force: true });
  });

  it("sanitizes unsafe table names in file paths", async () => {
    const unsafe = "../../../etc/passwd";
    const safe = sanitizeFilename(unsafe);
    expect(safe).not.toContain("/");
    expect(safe).not.toContain("..");
    expect(safe).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("escapes all markdown formatting characters", async () => {
    const { exportMarkdownDocs } =
      await import("../../src/exporters/markdown/markdown-exporter");

    const testDoc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "test_table",
          columns: [
            {
              name: "desc",
              type: "text",
              nullable: true,
              isPrimaryKey: false,
              isForeignKey: false,
              comment: "text with *bold* and `code` and [link]"
            }
          ],
          primaryKeys: [],
          foreignKeys: [],
          indexes: [],
          reviewTodos: []
        }
      ],
      relationships: [],
      indexes: [],
      warnings: []
    };

    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportMarkdownDocs(testDoc, { outDir: dir });

    const content = await readFile(
      join(dir, "tables", "test_table.md"),
      "utf8"
    );

    // The asterisks and backticks and brackets should be escaped with backslashes
    expect(content).toContain("\\*bold\\*");
    expect(content).toContain("\\`code\\`");
    expect(content).toContain("\\[link\\]");

    await rm(dir, { recursive: true, force: true });
  });
});
