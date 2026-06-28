import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OutputLanguage } from "../../core/config/schema";
import type { DatabaseDoc, TableDoc } from "../../core/model/database-doc";
import { sanitizeFilename } from "../../core/sanitize";
import { getOutputLabels } from "../shared/output-labels";

export type HtmlExportOptions = {
  outDir: string;
  language?: OutputLanguage;
};

export async function exportHtmlDocs(
  doc: DatabaseDoc,
  options: HtmlExportOptions
): Promise<void> {
  try {
    const htmlDir = join(options.outDir, "html");
    const tablesDir = join(htmlDir, "tables");
    await mkdir(tablesDir, { recursive: true });
    const labels = getOutputLabels(options.language);

    // index.html
    await writeFile(
      join(htmlDir, "index.html"),
      renderIndexPage(doc, labels),
      "utf8"
    );

    // per-table pages
    for (const table of doc.tables) {
      await writeFile(
        join(tablesDir, `${sanitizeFilename(table.name)}.html`),
        renderTablePage(table, doc, labels),
        "utf8"
      );
    }
  } catch (err) {
    throw new Error(
      `Failed to export HTML docs: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }
}

// ── Shared CSS ────────────────────────────────────────────────────────────────

const CSS = `
    :root {
      --bg: #f3f4f6;
      --paper: #ffffff;
      --text: #111827;
      --muted: #4b5563;
      --border: #bfc7d4;
      --accent: #4472c4;
      --accent-light: #dbe5f1;
      --accent-mid: #eef3f8;
      --pk-bg: #fff3cd;
      --fk-bg: #e8f4fd;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Yu Gothic UI", "Meiryo", Arial, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5;
      padding: 24px;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .sheet {
      max-width: 1200px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--border);
      padding: 24px;
    }
    h1 { font-size: 22px; margin-bottom: 16px; color: var(--accent); border-bottom: 2px solid var(--accent-light); padding-bottom: 8px; }
    h2 { font-size: 15px; margin: 20px 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 16px; }
    th, td {
      border: 1px solid var(--border);
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
      font-size: 13px;
    }
    thead th { background: var(--accent); color: #fff; font-weight: 700; }
    .meta th { background: var(--accent-light); font-weight: 700; color: #1f3864; width: 180px; }
    .meta td { background: #fafbfe; }
    .pk td:first-child { font-weight: 700; }
    .pk { background: var(--pk-bg); }
    .fk { background: var(--fk-bg); }
    .badge {
      display: inline-block; font-size: 10px; font-weight: 700;
      padding: 1px 5px; border-radius: 3px; margin-left: 4px; vertical-align: middle;
    }
    .badge-pk { background: #f59e0b; color: #fff; }
    .badge-fk { background: var(--accent); color: #fff; }
    .note { color: var(--muted); font-size: 12px; margin-top: 10px; }
    .back { margin-bottom: 16px; font-size: 13px; }
    .summary { display: flex; gap: 24px; margin-bottom: 20px; }
    .summary-item { background: var(--accent-light); border-radius: 6px; padding: 10px 18px; }
    .summary-item .num { font-size: 24px; font-weight: 700; color: var(--accent); }
    .summary-item .lbl { font-size: 12px; color: var(--muted); }
    .table-list { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .table-list th { background: var(--accent); color: #fff; }
    .table-list tr:nth-child(even) td { background: var(--accent-mid); }
    .table-list td:first-child a { font-weight: 600; }
`;

function pageShell(title: string, body: string, fromSubdir = false): string {
  const base = fromSubdir ? "../" : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>${CSS}  </style>
</head>
<body>
  <div class="sheet">
${body}
  </div>
</body>
</html>`;
}

// ── Index page ────────────────────────────────────────────────────────────────

function renderIndexPage(
  doc: DatabaseDoc,
  labels: ReturnType<typeof getOutputLabels>
): string {
  let tableRows = "";
  for (const table of doc.tables) {
    const pkCols = table.primaryKeys.join(", ") || labels.none;
    const fkCount = table.foreignKeys.length;
    const fileName = sanitizeFilename(table.name);
    tableRows += `      <tr>
        <td><a href="tables/${fileName}.html">${esc(table.name)}</a></td>
        <td>${esc(table.comment ?? "")}</td>
        <td style="text-align:center">${table.columns.length}</td>
        <td>${esc(pkCols)}</td>
        <td style="text-align:center">${fkCount}</td>
      </tr>\n`;
  }

  const body = `
  <h1>${esc(labels.docTitle)}</h1>
  <div class="summary">
    <div class="summary-item"><div class="num">${doc.tables.length}</div><div class="lbl">${esc(labels.tablesLabel)}</div></div>
    <div class="summary-item"><div class="num">${doc.relationships.length}</div><div class="lbl">${esc(labels.relationshipsLabel)}</div></div>
    <div class="summary-item"><div class="num">${doc.dialect}</div><div class="lbl">${esc(labels.dialectLabel)}</div></div>
  </div>
  <h2>${esc(labels.tableListHeading)}</h2>
  <table class="table-list">
    <thead><tr>
      <th>${esc(labels.tableLabel)}</th>
      <th>${esc(labels.tableLogicalName)}</th>
      <th style="width:70px;text-align:center">Cols</th>
      <th>${esc(labels.primaryKey)}</th>
      <th style="width:50px;text-align:center">FK</th>
    </tr></thead>
    <tbody>
${tableRows}    </tbody>
  </table>
  <p class="note">${esc(labels.generatedNote)}</p>
`;
  return pageShell(labels.docTitle, body);
}

// ── Per-table page ────────────────────────────────────────────────────────────

function renderTablePage(
  table: TableDoc,
  doc: DatabaseDoc,
  labels: ReturnType<typeof getOutputLabels>
): string {
  const indexes = collectTableIndexes(table, doc);

  const foreignKeys = table.foreignKeys.length
    ? table.foreignKeys
        .map((fk) => {
          const name = fk.name ? ` (${fk.name})` : "";
          return `${fk.columns.join(", ")} → ${fk.referencedTable}.${fk.referencedColumns.join(", ")}${name}`;
        })
        .join("<br>")
    : labels.none;

  const indexText = indexes.length
    ? indexes
        .map(
          (idx) =>
            `${idx.name} (${idx.columns.join(", ")})${idx.unique ? " UNIQUE" : ""}`
        )
        .join("<br>")
    : labels.none;

  let colRows = "";
  for (const col of table.columns) {
    const pkBadge = col.isPrimaryKey
      ? `<span class="badge badge-pk">PK</span>`
      : "";
    const fkBadge = col.isForeignKey
      ? `<span class="badge badge-fk">FK</span>`
      : "";
    const rowClass = col.isPrimaryKey ? "pk" : col.isForeignKey ? "fk" : "";
    const required = col.nullable ? labels.no : labels.yes;
    colRows += `      <tr${rowClass ? ` class="${rowClass}"` : ""}>`
      + `<td>${esc(col.name)}${pkBadge}${fkBadge}</td>`
      + `<td>${esc(col.comment ?? "")}</td>`
      + `<td>${esc(col.type)}</td>`
      + `<td>${required}</td>`
      + `<td>${esc(col.defaultValue ?? "-")}</td>`
      + `<td>${esc(col.description?.value ?? "")}</td>`
      + `</tr>\n`;
  }

  const body = `
  <p class="back"><a href="../index.html">← ${esc(labels.tableListHeading)}</a></p>
  <h1>${esc(table.name)}</h1>
  <h2>${esc(labels.tableInfoHeading)}</h2>
  <table class="meta">
    <tbody>
      <tr><th>${esc(labels.tablePhysicalName)}</th><td>${esc(table.name)}</td></tr>
      <tr><th>${esc(labels.tableLogicalName)}</th><td>${esc(table.comment ?? "")}</td></tr>
      <tr><th>${esc(labels.schema)}</th><td>${esc(table.schema ?? "")}</td></tr>
      <tr><th>${esc(labels.primaryKey)}</th><td>${esc(table.primaryKeys.join(", ") || labels.none)}</td></tr>
      <tr><th>${esc(labels.foreignKeys)}</th><td>${foreignKeys}</td></tr>
      <tr><th>${esc(labels.indexes)}</th><td>${indexText}</td></tr>
    </tbody>
  </table>

  <h2>${esc(labels.columnsHeading)}</h2>
  <table class="columns">
    <thead><tr>
      <th>${esc(labels.physicalName)}</th>
      <th>${esc(labels.logicalName)}</th>
      <th>${esc(labels.type)}</th>
      <th>${esc(labels.required)}</th>
      <th>${esc(labels.defaultValue)}</th>
      <th>${esc(labels.notes)}</th>
    </tr></thead>
    <tbody>
${colRows}    </tbody>
  </table>
  <p class="note">${esc(labels.generatedNote)}</p>
`;
  return pageShell(table.name, body);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function collectTableIndexes(table: TableDoc, doc: DatabaseDoc) {
  return [
    ...table.indexes,
    ...doc.indexes.filter(
      (idx) =>
        idx.table === table.name &&
        !table.indexes.some((tableIdx) => tableIdx.name === idx.name)
    ),
  ];
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
