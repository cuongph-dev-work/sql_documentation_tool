import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { isLikelyRelatedToTable } from "./matcher";

export type SourceChunk = {
  content: string;
  startLine: number;
  endLine: number;
};

export type SourceContextFile = {
  path: string;
  relatedTables: string[];
  chunks: SourceChunk[];
};

export type SourceContext = {
  files: SourceContextFile[];
};

export type ScanSourceContextOptions = {
  rootDir: string;
  include: string[];
  exclude: string[];
  tableNames: string[];
  maxLinesPerChunk?: number;
};

export async function scanSourceContext(
  options: ScanSourceContextOptions
): Promise<SourceContext> {
  const paths = await fg(options.include, {
    cwd: options.rootDir,
    absolute: true,
    ignore: options.exclude
  });

  const files: SourceContextFile[] = [];

  for (const path of paths) {
    let content: string;
    try {
      content = await readFile(path, "utf8");
    } catch {
      continue;
    }
    const relatedTables = options.tableNames.filter((tableName) =>
      isLikelyRelatedToTable(path, content, tableName)
    );
    if (relatedTables.length === 0) continue;
    files.push({
      path,
      relatedTables,
      chunks: chunkContent(content, options.maxLinesPerChunk ?? 120)
    });
  }

  return { files };
}

function chunkContent(content: string, maxLines: number): SourceChunk[] {
  const lines = content.split("\n");
  const chunks: SourceChunk[] = [];
  for (let index = 0; index < lines.length; index += maxLines) {
    const chunkLines = lines.slice(index, index + maxLines);
    chunks.push({
      content: chunkLines.join("\n"),
      startLine: index + 1,
      endLine: index + chunkLines.length
    });
  }
  return chunks;
}
