import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultRules } from "./default-rules";

export type LoadedRules = Record<string, string>;

export async function loadAiRules(rulesDir?: string): Promise<LoadedRules> {
  const rules: LoadedRules = { ...defaultRules };

  if (!rulesDir) return rules;

  for (const name of Object.keys(defaultRules)) {
    try {
      const content = await readFile(join(rulesDir, name), "utf8");
      rules[name] = content;
    } catch {
      // Custom rule not found, keep default
    }
  }

  return rules;
}
