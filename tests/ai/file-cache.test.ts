import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("file-cache", () => {
  it("cache miss returns null", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "cache-test-"));
    try {
      const { getCachedResponse } =
        await import("../../src/ai/cache/file-cache");
      const result = await getCachedResponse(
        { table: "users", model: "gpt-4" },
        { cacheDir: tmpDir }
      );
      expect(result).toBeNull();
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("cache write+read roundtrips the response", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "cache-test-"));
    try {
      const { getCachedResponse, setCachedResponse } =
        await import("../../src/ai/cache/file-cache");
      const key = { table: "orders", model: "gpt-4" };
      const original = JSON.stringify({
        purpose: "Stores customer orders",
        confidence: "high"
      });

      await setCachedResponse(key, original, { cacheDir: tmpDir });
      const cached = await getCachedResponse(key, { cacheDir: tmpDir });

      expect(cached).toBe(original);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("different keys produce different cache files", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "cache-test-"));
    try {
      const { getCachedResponse, setCachedResponse } =
        await import("../../src/ai/cache/file-cache");
      const keyA = { table: "users", model: "gpt-4" };
      const keyB = { table: "orders", model: "gpt-4" };
      const respA = "response for users";
      const respB = "response for orders";

      await setCachedResponse(keyA, respA, { cacheDir: tmpDir });
      await setCachedResponse(keyB, respB, { cacheDir: tmpDir });

      const cachedA = await getCachedResponse(keyA, { cacheDir: tmpDir });
      const cachedB = await getCachedResponse(keyB, { cacheDir: tmpDir });

      expect(cachedA).toBe(respA);
      expect(cachedB).toBe(respB);
      expect(cachedA).not.toBe(cachedB);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("same key returns cached response (no duplicate writes needed)", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "cache-test-"));
    try {
      const { getCachedResponse, setCachedResponse } =
        await import("../../src/ai/cache/file-cache");
      const key = { table: "products", model: "gpt-4" };
      const resp = "cached products response";

      await setCachedResponse(key, resp, { cacheDir: tmpDir });

      // First read
      const first = await getCachedResponse(key, { cacheDir: tmpDir });
      expect(first).toBe(resp);

      // Second read should also hit
      const second = await getCachedResponse(key, { cacheDir: tmpDir });
      expect(second).toBe(resp);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
