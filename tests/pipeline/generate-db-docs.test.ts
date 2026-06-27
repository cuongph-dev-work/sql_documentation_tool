import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateDbDocs } from "../../src/core/pipeline/generate-db-docs";

describe("generateDbDocs", () => {
  it("generates deterministic v0.1 outputs without AI", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "dbdocgen-out-"));

    await generateDbDocs({
      schema: "fixtures/postgres/basic-schema.sql",
      outDir,
      output: { formats: ["excel", "diagram"] },
      ai: { enabled: false }
    });

    await expect(readdir(outDir)).resolves.toEqual(expect.arrayContaining(["database_dictionary.xlsx", "er_diagram.mmd"]));
    await rm(outDir, { recursive: true, force: true });
  });
});
