import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/core/config/loader";

describe("loadConfig", () => {
  it("merges CLI options over defaults", async () => {
    const config = await loadConfig({
      cwd: process.cwd(),
      cliOptions: {
        schema: "./database/schema.sql",
        outDir: "./docs/db",
        ai: false,
        formats: ["excel", "diagram"]
      }
    });

    expect(config.schema).toBe("./database/schema.sql");
    expect(config.outDir).toBe("./docs/db");
    expect(config.ai.enabled).toBe(false);
    expect(config.output.formats).toEqual(["excel", "diagram"]);
  });

  it("loads .dbdocgenrc and allows CLI override", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await writeFile(
      join(dir, ".dbdocgenrc"),
      JSON.stringify({
        schema: "./schema.sql",
        outDir: "./generated",
        ai: { enabled: true, model: "configured-model" }
      })
    );

    const config = await loadConfig({
      cwd: dir,
      cliOptions: {
        outDir: "./docs/db",
        ai: false
      }
    });

    expect(config.schema).toBe("./schema.sql");
    expect(config.outDir).toBe("./docs/db");
    expect(config.ai.enabled).toBe(false);
    expect(config.ai.model).toBe("configured-model");

    await rm(dir, { recursive: true, force: true });
  });
});
