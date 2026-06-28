import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateDbDocs } from "../../src/core/pipeline/generate-db-docs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = (relative: string) => join(__dirname, relative);

describe("generateDbDocs", () => {
  it("generates A5-style outputs with English labels by default", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "dbdocgen-out-"));

    await generateDbDocs({
      schema: fixturePath("../../fixtures/postgres/basic-schema.sql"),
      outDir,
      output: {
        formats: ["excel", "markdown", "html", "diagram", "word"],
        language: "en"
      }
    });

    await expect(readdir(outDir)).resolves.toEqual(
      expect.arrayContaining([
        "database_dictionary.xlsx",
        "database_document.docx",
        "er_diagram.mmd",
        "er_diagram.png",
        "ER_DIAGRAM.md",
        "html",
        "tables"
      ])
    );
    await expect(stat(join(outDir, "DATABASE.md"))).rejects.toThrow();
    await expect(stat(join(outDir, "html", "index.html"))).resolves.toMatchObject({ size: expect.any(Number) });
    await expect(stat(join(outDir, "html", "er-diagram.html"))).resolves.toMatchObject({ size: expect.any(Number) });
    await expect(stat(join(outDir, "ER_DIAGRAM.md"))).resolves.toMatchObject({ size: expect.any(Number) });

    const tableMarkdown = await readFile(
      join(outDir, "tables", "users.md"),
      "utf8"
    );
    expect(tableMarkdown).toContain("## Table Info");
    expect(tableMarkdown).toContain(
      "| Physical Name | Logical Name | Type | Size | Required | Default Value | Min | Max | Unique | Notes |"
    );
    expect(tableMarkdown).toContain("| email |  | varchar(255) | 255 |");
    expect(tableMarkdown).toContain("| Yes |");

    const tableHtml = await readFile(
      join(outDir, "html", "tables", "users.html"),
      "utf8"
    );
    expect(tableHtml).toContain("Table Info");
    expect(tableHtml).toContain("Table Physical Name");

    await rm(outDir, { recursive: true, force: true });
  });

  it("auto-detects MySQL schema dialect during generation", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "dbdocgen-out-"));

    const doc = await generateDbDocs({
      schema: fixturePath("../../db_diagram_27062026.sql"),
      outDir,
      output: { formats: ["diagram"] }
    });

    expect(doc.dialect).toBe("mysql");
    expect(doc.tables.length).toBeGreaterThan(0);
    expect(doc.warnings.map((warning) => warning.code)).toContain(
      "DIALECT_AUTO_DETECTED"
    );

    await rm(outDir, { recursive: true, force: true });
  });

  it("reports progress callbacks for main generation steps", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "dbdocgen-out-"));
    const steps: string[] = [];

    await generateDbDocs({
      schema: fixturePath("../../fixtures/postgres/basic-schema.sql"),
      outDir,
      output: { formats: ["excel", "diagram"], language: "en" },
      onProgress: (event) => {
        steps.push(event.step);
      }
    });

    expect(steps).toContain("read_schema");
    expect(steps).toContain("parse_schema");
    expect(steps).toContain("export_excel");
    expect(steps).toContain("export_diagram");
    expect(steps.at(-1)).toBe("complete");

    await rm(outDir, { recursive: true, force: true });
  });
});
