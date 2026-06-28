import { describe, expect, it } from "vitest";
import {
  createTimestampedRunName,
  isOutputRunDir,
  resolveGenerateOutDir
} from "../../src/core/output-path";

describe("output-path", () => {
  const fixedDate = new Date("2026-06-28T19:47:00");

  it("creates timestamped run folder under parent outDir", () => {
    expect(createTimestampedRunName(fixedDate)).toBe("db_doc_gen_2606281947");
    expect(resolveGenerateOutDir("./output", fixedDate)).toBe(
      "output/db_doc_gen_2606281947"
    );
    expect(resolveGenerateOutDir("/tmp/docs", fixedDate)).toBe(
      "/tmp/docs/db_doc_gen_2606281947"
    );
  });

  it("detects generated run directories", () => {
    expect(isOutputRunDir("./output/db_doc_gen_2606281947")).toBe(true);
    expect(isOutputRunDir("./output")).toBe(false);
  });
});
