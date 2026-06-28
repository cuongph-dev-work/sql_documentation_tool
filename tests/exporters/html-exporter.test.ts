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

describe("exportHtmlDocs", () => {
  it("writes index.html + per-table html files in A5:SQL layout", async () => {
    const { exportHtmlDocs } =
      await import("../../src/exporters/html/html-exporter");
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportHtmlDocs(doc, { outDir: dir, language: "jp" });

    // index.html must exist
    await expect(
      stat(join(dir, "html", "index.html"))
    ).resolves.toMatchObject({ size: expect.any(Number) });

    // per-table html must exist
    await expect(
      stat(join(dir, "html", "tables", "users.html"))
    ).resolves.toMatchObject({
      size: expect.any(Number)
    });
    expect(await readdir(join(dir, "html"))).toContain("tables");

    // index page content
    const indexContent = await readFile(join(dir, "html", "index.html"), "utf8");
    expect(indexContent).toContain("users");
    expect(indexContent).toContain("tables/users.html");

    const tableContent = await readFile(
      join(dir, "html", "tables", "users.html"),
      "utf8"
    );
    expect(tableContent).toContain("<table");
    expect(tableContent).toContain("</table>");
    expect(tableContent).toContain("<h1>users</h1>");
    expect(tableContent).toContain("Table Info");
    expect(tableContent).toContain("テーブル物理名");
    expect(tableContent).toContain("Users table");
    expect(tableContent).toContain("物理名");
    expect(tableContent).toContain("論理名");
    expect(tableContent).toContain("デフォルト値");
    expect(tableContent).toContain("id");
    // PK badge
    expect(tableContent).toContain("badge-pk");
    // back link
    expect(tableContent).toContain("../index.html");

    await rm(dir, { recursive: true, force: true });
  });

  it("uses English labels by default and supports Vietnamese", async () => {
    const { exportHtmlDocs } =
      await import("../../src/exporters/html/html-exporter");
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));

    await exportHtmlDocs(doc, { outDir: dir });
    const defaultContent = await readFile(
      join(dir, "html", "tables", "users.html"),
      "utf8"
    );
    expect(defaultContent).toContain("Table Info");
    expect(defaultContent).toContain("Table Physical Name");
    expect(defaultContent).toContain("Physical Name");
    expect(defaultContent).toContain("Default Value");

    await exportHtmlDocs(doc, { outDir: dir, language: "jp" });
    const jpContent = await readFile(
      join(dir, "html", "tables", "users.html"),
      "utf8"
    );
    expect(jpContent).toContain("テーブル物理名");
    expect(jpContent).toContain("物理名");
    expect(jpContent).toContain("デフォルト値");

    await rm(dir, { recursive: true, force: true });
  });

  it("sanitizes unsafe names for table html file paths", async () => {
    const { exportHtmlDocs } =
      await import("../../src/exporters/html/html-exporter");

    const testDoc: DatabaseDoc = {
      dialect: "postgres",
      tables: [
        {
          name: "users with spaces?x=1",
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

    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportHtmlDocs(testDoc, { outDir: dir });

    const safe = sanitizeFilename("users with spaces?x=1");
    expect(safe).toBe("users_with_spaces_x_1");
    await expect(
      stat(join(dir, "html", "tables", `${safe}.html`))
    ).resolves.toMatchObject({
      size: expect.any(Number)
    });

    await rm(dir, { recursive: true, force: true });
  });
});
