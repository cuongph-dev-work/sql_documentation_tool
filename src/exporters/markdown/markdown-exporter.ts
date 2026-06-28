import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OutputLanguage } from "../../core/config/schema";
import type { DatabaseDoc, TableDoc } from "../../core/model/database-doc";
import { sanitizeFilename } from "../../core/sanitize";
import { getOutputLabels } from "../shared/output-labels";
import {
  columnDefinitionHeaders,
  columnDefinitionRow
} from "../shared/column-definition";
import {
  getErDiagramMermaid,
  renderErDiagramMarkdown
} from "../diagram/er-diagram-embed";

export type MarkdownExportOptions = {
  outDir: string;
  language?: OutputLanguage;
};

export async function exportMarkdownDocs(
  doc: DatabaseDoc,
  options: MarkdownExportOptions
): Promise<void> {
  try {
    const tablesDir = join(options.outDir, "tables");
    await mkdir(tablesDir, { recursive: true });
    const labels = getOutputLabels(options.language);

    if (doc.tables.length > 0) {
      const mermaid = getErDiagramMermaid(doc);
      await writeFile(
        join(options.outDir, "ER_DIAGRAM.md"),
        renderErDiagramMarkdown(mermaid, labels),
        "utf8"
      );
    }

    for (const table of doc.tables) {
      await writeFile(
        join(tablesDir, `${sanitizeFilename(table.name)}.md`),
        renderTableDoc(table, doc, labels),
        "utf8"
      );
    }
  } catch (err) {
    throw new Error(
      `Failed to export Markdown docs: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }
}

function renderTableDoc(
  table: TableDoc,
  doc: DatabaseDoc,
  labels: ReturnType<typeof getOutputLabels>
): string {
  const lines: string[] = [];
  const tableIndexes = collectTableIndexes(table, doc);

  lines.push(`# ${escapeMd(table.name)}`);
  lines.push("");
  lines.push(`## ${labels.tableInfoHeading}`);
  lines.push("");
  lines.push(`| ${labels.metaField} | ${labels.metaValue} |`);
  lines.push("|------|----|");
  lines.push(`| ${labels.tablePhysicalName} | ${escapeMd(table.name)} |`);
  lines.push(`| ${labels.tableLogicalName} | ${escapeMd(table.comment ?? "")} |`);
  lines.push(`| ${labels.schema} | ${escapeMd(table.schema ?? "")} |`);
  lines.push(
    `| ${labels.primaryKey} | ${escapeMd(table.primaryKeys.join(", ") || labels.none)} |`
  );
  lines.push(
    `| ${labels.foreignKeys} | ${escapeMd(
      table.foreignKeys.length > 0
        ? table.foreignKeys
            .map((fk) => {
              const name = fk.name ? ` (${fk.name})` : "";
              return `${fk.columns.join(", ")} -> ${fk.referencedTable}.${fk.referencedColumns.join(", ")}${name}`;
            })
            .join("; ")
        : labels.none
    )} |`
  );
  lines.push(
    `| ${labels.indexes} | ${escapeMd(
      tableIndexes.length > 0
        ? tableIndexes
            .map(
              (idx) =>
                `${idx.name} (${idx.columns.join(", ")})${idx.unique ? " UNIQUE" : ""}`
            )
            .join("; ")
        : labels.none
    )} |`
  );
  lines.push("");
  lines.push(`## ${labels.columnsHeading}`);
  lines.push("");
  lines.push(
    `| ${columnDefinitionHeaders(labels).join(" | ")} |`
  );
  lines.push(`|${columnDefinitionHeaders(labels).map(() => "--------").join("|")}|`);

  for (const col of table.columns) {
    lines.push(
      `| ${columnDefinitionRow(col, labels).map((value) => escapeMd(value)).join(" | ")} |`
    );
  }
  lines.push("");

  return lines.join("\n");
}

function collectTableIndexes(table: TableDoc, doc: DatabaseDoc) {
  return [
    ...table.indexes,
    ...doc.indexes.filter(
      (idx) =>
        idx.table === table.name &&
        !table.indexes.some((tableIdx) => tableIdx.name === idx.name)
    )
  ];
}

function escapeMd(text: string): string {
  return text.replace(/([|*_`\[\]<>#~\\])/g, "\\$1");
}
