import { basename, join } from "node:path";

export const OUTPUT_RUN_DIR_PREFIX = "db_doc_gen_";

export function createTimestampedRunName(date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${OUTPUT_RUN_DIR_PREFIX}${year}${month}${day}${hours}${minutes}`;
}

/** Parent output folder + timestamped run directory. */
export function resolveGenerateOutDir(parentDir: string, date = new Date()): string {
  return join(parentDir, createTimestampedRunName(date));
}

export function isOutputRunDir(path: string): boolean {
  return basename(path).startsWith(OUTPUT_RUN_DIR_PREFIX);
}

export function isOutputRunDirName(name: string): boolean {
  return name.startsWith(OUTPUT_RUN_DIR_PREFIX);
}
