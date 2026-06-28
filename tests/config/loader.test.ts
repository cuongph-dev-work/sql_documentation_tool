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
        formats: ["excel", "diagram"]
      }
    });

    expect(config.schema).toBe("./database/schema.sql");
    expect(config.outDir).toBe("./docs/db");
    expect(config.output.formats).toEqual(["excel", "diagram"]);
  });

  it("loads .dbdocgenrc and allows CLI override", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await writeFile(
      join(dir, ".dbdocgenrc"),
      JSON.stringify({
        schema: "./schema.sql",
        outDir: "./generated",
        output: { formats: ["markdown"] }
      })
    );

    const config = await loadConfig({
      cwd: dir,
      cliOptions: {
        outDir: "./docs/db"
      }
    });

    expect(config.schema).toBe("./schema.sql");
    expect(config.outDir).toBe("./docs/db");
    expect(config.output.formats).toEqual(["markdown"]);

    await rm(dir, { recursive: true, force: true });
  });

  it("accepts dialect from config and CLI overrides", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await writeFile(
      join(dir, ".dbdocgenrc"),
      JSON.stringify({
        schema: "./schema.sql",
        dialect: "postgres"
      })
    );

    const config = await loadConfig({
      cwd: dir,
      cliOptions: {
        // @ts-expect-error added in implementation after red test
        dialect: "mysql"
      }
    });

    // @ts-expect-error added in implementation after red test
    expect(config.dialect).toBe("mysql");

    await rm(dir, { recursive: true, force: true });
  });
});
