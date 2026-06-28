import { mkdtemp, readdir, rm, stat, readFile } from "node:fs/promises";
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
      comment: "Users table",
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
  it("writes only per-table markdown files in A5:SQL layout", async () => {
    const { exportMarkdownDocs } =
      await import("../../src/exporters/markdown/markdown-exporter");
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportMarkdownDocs(doc, { outDir: dir, language: "jp" });

    await expect(stat(join(dir, "tables", "users.md"))).resolves.toMatchObject({
      size: expect.any(Number)
    });
    await expect(stat(join(dir, "DATABASE.md"))).rejects.toThrow();
    await expect(stat(join(dir, "html", "index.html"))).rejects.toThrow();
    expect(await readdir(dir)).toContain("tables");

    const tableContent = await readFile(
      join(dir, "tables", "users.md"),
      "utf8"
    );
    expect(tableContent).toContain("# users");
    expect(tableContent).toContain("## Table Info");
    expect(tableContent).toContain("| 項目 | 値 |");
    expect(tableContent).toContain("| テーブル物理名 | users |");
    expect(tableContent).toContain("| テーブル論理名 | Users table |");
    expect(tableContent).toContain("## Columns");
    expect(tableContent).toContain(
      "| 物理名 | 論理名 | 型 | 必須 | デフォルト値 | 備考 |"
    );
    expect(tableContent).toContain(
      "| email | user email address | varchar | Yes | - |  |"
    );

    await rm(dir, { recursive: true, force: true });
  });

  it("uses English labels by default and supports Vietnamese", async () => {
    const { exportMarkdownDocs } =
      await import("../../src/exporters/markdown/markdown-exporter");
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));

    await exportMarkdownDocs(doc, { outDir: dir });
    const defaultContent = await readFile(join(dir, "tables", "users.md"), "utf8");
    expect(defaultContent).toContain("## Table Info");
    expect(defaultContent).toContain("| Field | Value |");
    expect(defaultContent).toContain("| Table Physical Name | users |");
    expect(defaultContent).toContain(
      "| Physical Name | Logical Name | Type | Required | Default Value | Notes |"
    );

    await exportMarkdownDocs(doc, { outDir: dir, language: "jp" });
    const jpContent = await readFile(join(dir, "tables", "users.md"), "utf8");
    expect(jpContent).toContain("## Table Info");
    expect(jpContent).toContain("| 項目 | 値 |");
    expect(jpContent).toContain("| テーブル物理名 | users |");
    expect(jpContent).toContain(
      "| 物理名 | 論理名 | 型 | 必須 | デフォルト値 | 備考 |"
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

  it("escapes all markdown formatting characters in logical name and notes", async () => {
    const { exportMarkdownDocs } =
      await import("../../src/exporters/markdown/markdown-exporter");

    const testDoc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "test_table",
          comment: "table *note*",
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

    expect(content).toContain("table \\*note\\*");
    expect(content).toContain("\\*bold\\*");
    expect(content).toContain("\\`code\\`");
    expect(content).toContain("\\[link\\]");

    await rm(dir, { recursive: true, force: true });
  });
});
