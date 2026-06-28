import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type CacheOptions = {
  cacheDir: string;
};

function hashKey(input: Record<string, string>): string {
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedResponse(
  key: Record<string, string>,
  options: CacheOptions
): Promise<string | null> {
  const hashed = hashKey(key);
  const cachePath = join(options.cacheDir, `${hashed}.json`);
  try {
    const data = await readFile(cachePath, "utf8");
    return JSON.parse(data).response as string;
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  key: Record<string, string>,
  response: string,
  options: CacheOptions
): Promise<void> {
  const hashed = hashKey(key);
  const cachePath = join(options.cacheDir, `${hashed}.json`);
  await mkdir(options.cacheDir, { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify({ response, cachedAt: new Date().toISOString() }),
    "utf8"
  );
}
