import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DatabaseDoc } from "../../core/model/database-doc";

export type DiagramExportOptions = {
  outDir: string;
};

export async function exportMermaidDiagram(doc: DatabaseDoc, options: DiagramExportOptions): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  await writeFile(join(options.outDir, "er_diagram.mmd"), renderMermaid(doc), "utf8");
}

export function renderMermaid(doc: DatabaseDoc): string {
  const lines = ["erDiagram"];

  // Warnings as Mermaid comments
  for (const warning of doc.warnings) {
    const target = warning.target ? ` (${warning.target})` : "";
    lines.push(`  %% WARNING [${warning.severity}] ${warning.code}${target}: ${warning.message}`);
  }

  for (const table of doc.tables) {
    // Table review TODOs as comments
    for (const todo of table.reviewTodos) {
      lines.push(`  %% TODO [${todo.type}] ${todo.target}: ${todo.issue}`);
    }

    lines.push(`  ${table.name} {`);
    for (const column of table.columns) {
      const markers = [column.isPrimaryKey ? "PK" : "", column.isForeignKey ? "FK" : ""].filter(Boolean).join(" ");
      lines.push(`    ${sanitizeType(column.type)} ${column.name}${markers ? ` "${markers}"` : ""}`);
    }
    lines.push("  }");
  }

  for (const relationship of doc.relationships.filter((item) => item.source === "schema")) {
    lines.push(`  ${relationship.toTable} ||--o{ ${relationship.fromTable} : "${relationship.constraintName ?? relationship.fromColumn}"`);
  }

  return `${lines.join("\n")}\n`;
}

function sanitizeType(type: string): string {
  return type.replace(/[^a-zA-Z0-9_]/g, "_");
}
