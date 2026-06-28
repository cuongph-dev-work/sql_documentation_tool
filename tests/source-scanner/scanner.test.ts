import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scanSourceContext } from "../../src/source-scanner/scanner";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("scanSourceContext", () => {
  it("finds source files related to table names", async () => {
    const context = await scanSourceContext({
      rootDir: resolve(
        __dirname,
        "../../fixtures/source/typescript-sample/src"
      ),
      include: ["**/*.ts"],
      exclude: [],
      tableNames: ["orders"]
    });

    expect(context.files[0]).toMatchObject({
      path: expect.stringContaining("order.service.ts")
    });
    expect(context.files[0]?.chunks[0]?.content).toContain("completeCheckout");
  });
});
