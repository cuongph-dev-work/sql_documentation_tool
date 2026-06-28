export function isLikelyRelatedToTable(
  filePath: string,
  content: string,
  tableName: string
): boolean {
  const singular = tableName.endsWith("s") ? tableName.slice(0, -1) : tableName;
  const haystack = `${filePath}\n${content}`.toLowerCase();
  return (
    haystack.includes(tableName.toLowerCase()) ||
    haystack.includes(singular.toLowerCase())
  );
}
