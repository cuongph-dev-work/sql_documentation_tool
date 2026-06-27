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

    // Content validation: contains <table and </table>
    const tableContent = await readFile(
      join(dir, "html", "tables", "users.html"),
      "utf8",
    );
    expect(tableContent).toContain("<table");
    expect(tableContent).toContain("</table>");

    // Content validation: table name in a heading
    expect(tableContent).toContain("<h1>users</h1>");

    // Content validation: column name
    expect(tableContent).toContain("id");

    await rm(dir, { recursive: true, force: true });
  });

  it("uses encodeURIComponent for href attributes with unsafe names", async () => {
    const { exportHtmlDocs } = await import(
      "../../src/exporters/html/html-exporter"
    );

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

    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportHtmlDocs(testDoc, { outDir: dir });

    const indexContent = await readFile(
      join(dir, "html", "index.html"),
      "utf8",
    );

    // The sanitized filename has all special chars replaced with _
    const safe = sanitizeFilename("users with spaces?x=1");
    expect(safe).toBe("users_with_spaces_x_1");

    // The href should use encodeURIComponent on the sanitized filename
    const encoded = encodeURIComponent(safe);
    expect(encoded).toBe("users_with_spaces_x_1");
    expect(indexContent).toContain(`href="tables/${encoded}.html"`);

    await rm(dir, { recursive: true, force: true });
  });
});
