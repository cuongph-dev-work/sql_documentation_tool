/**
 * Sanitize a table name for safe use in file paths.
 * Valid chars: alphanumeric, underscore, hyphen.
 * Everything else (including path separators, traversal sequences) → `_`.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}
