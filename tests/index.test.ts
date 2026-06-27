import { describe, it, expect } from "vitest";
import { version } from "../src/index.js";

describe("dbdocgen", () => {
  it("exports a version string", () => {
    expect(version).toBe("0.1.0");
  });
});
