import { describe, expect, it, afterAll } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadAiRules } from "../../src/ai/rules/rule-loader";

let tmpDir: string | undefined;

afterAll(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

describe("loadAiRules", () => {
  it("returns defaults when no rulesDir is provided", async () => {
    const rules = await loadAiRules();

    expect(rules).toHaveProperty("system.md");
    expect(rules).toHaveProperty("source-scan.md");
    expect(rules).toHaveProperty("table-enrich.md");
    expect(rules).toHaveProperty("column-enrich.md");
    expect(rules).toHaveProperty("relationship-review.md");

    expect(typeof rules["system.md"]).toBe("string");
    expect(rules["system.md"].length).toBeGreaterThan(0);
  });

  it("overrides a default rule with a custom rule file from rulesDir", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "dbdocgen-rule-loader-test-"));

    const customSystemContent = "Custom system prompt for testing.";
    await writeFile(join(tmpDir, "system.md"), customSystemContent, "utf8");

    const rules = await loadAiRules(tmpDir);

    expect(rules["system.md"]).toBe(customSystemContent);
    // Other rules should still be the defaults
    expect(rules["source-scan.md"].length).toBeGreaterThan(0);
    expect(rules["table-enrich.md"].length).toBeGreaterThan(0);
    expect(rules["column-enrich.md"].length).toBeGreaterThan(0);
    expect(rules["relationship-review.md"].length).toBeGreaterThan(0);
  });

  it("falls back to defaults when a custom rule file is missing", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "dbdocgen-rule-loader-test-"));

    // Only write one rule file, leaving others missing
    await writeFile(join(tmpDir, "system.md"), "Custom system", "utf8");

    const rules = await loadAiRules(tmpDir);

    // Overridden rule
    expect(rules["system.md"]).toBe("Custom system");

    // Missing custom files fall back to defaults
    expect(rules["source-scan.md"].length).toBeGreaterThan(0);
    expect(rules["table-enrich.md"].length).toBeGreaterThan(0);
    expect(rules["column-enrich.md"].length).toBeGreaterThan(0);
    expect(rules["relationship-review.md"].length).toBeGreaterThan(0);
  });
});
