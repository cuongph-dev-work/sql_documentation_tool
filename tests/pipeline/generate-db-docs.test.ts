import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateDbDocs } from "../../src/core/pipeline/generate-db-docs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = (relative: string) => join(__dirname, relative);

describe("generateDbDocs", () => {
  it("generates deterministic v0.1 outputs without AI", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "dbdocgen-out-"));

    await generateDbDocs({
      schema: fixturePath("../../fixtures/postgres/basic-schema.sql"),
      outDir,
      output: { formats: ["excel", "diagram"] },
      ai: { enabled: false }
    });

    await expect(readdir(outDir)).resolves.toEqual(expect.arrayContaining(["database_dictionary.xlsx", "er_diagram.mmd"]));
    await rm(outDir, { recursive: true, force: true });
  });
});
