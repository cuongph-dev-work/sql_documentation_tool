import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import type { OutputLanguage } from "../../core/config/schema";
import type { DatabaseDoc, TableDoc } from "../../core/model/database-doc";
import { getOutputLabels, type OutputLabels } from "../shared/output-labels";

const COLOR = {
  headerBg: "FF4472C4",
  headerFg: "FFFFFFFF",
  metaBg: "FFD9E1F2",
  metaFg: "FF1F3864",
  overviewBg: "FF4472C4",
  overviewFg: "FFFFFFFF",
  altRow: "FFF2F7FF",
  pkBg: "FFFFF3CD",
  fkBg: "FFE8F4FD",
  link: "FF0563C1",
  border: "FFB8CCE4",
  valueBg: "FFFAFBFE",
};

const COL_COUNT = 7; // overview + table definition columns

export type ExportOptions = {
  outDir: string;
  language?: OutputLanguage;
};

export async function exportExcelDictionary(
  doc: DatabaseDoc,
  options: ExportOptions
): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  const workbook = new ExcelJS.Workbook();
  const labels = getOutputLabels(options.language);

  const sheetNames = new Map<string, string>();
  for (const table of doc.tables) {
    sheetNames.set(table.name, buildSheetName(table.name, sheetNames));
  }

  addOverviewSheet(workbook, doc, labels, sheetNames);

  for (const table of doc.tables) {
    const sheetName = sheetNames.get(table.name)!;
    const sheet = workbook.addWorksheet(sheetName);
    populateTableSheet(sheet, table, doc, labels);
  }

  await workbook.xlsx.writeFile(
    join(options.outDir, "database_dictionary.xlsx")
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function addOverviewSheet(
  workbook: ExcelJS.Workbook,
  doc: DatabaseDoc,
  labels: OutputLabels,
  sheetNames: Map<string, string>
) {
  const sheet = workbook.addWorksheet("Overview");

  // Row 1: title
  sheet.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = labels.docTitle;
  titleCell.font = { bold: true, size: 14, color: { argb: COLOR.overviewFg } };
  titleCell.fill = solidFill(COLOR.overviewBg);
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.addRow([]);

  // Summary block (rows 3–5)
  const summary: [string, string | number][] = [
    [labels.dialectLabel, doc.dialect],
    [labels.tablesLabel, doc.tables.length],
    [labels.relationshipsLabel, doc.relationships.length],
  ];
  for (const [field, value] of summary) {
    const row = sheet.addRow([field, value]);
    styleMetaRow(row);
    applyBorderToRow(row, 2);
  }

  sheet.addRow([]);

  // Section heading (row 7)
  const sectionRow = sheet.addRow([labels.tableListHeading]);
  sheet.mergeCells(sectionRow.number, 1, sectionRow.number, COL_COUNT);
  const sectionCell = sectionRow.getCell(1);
  sectionCell.font = { bold: true, size: 11, color: { argb: COLOR.metaFg } };
  sectionCell.fill = solidFill(COLOR.metaBg);
  sectionCell.alignment = { vertical: "middle" };
  sectionRow.height = 22;

  // Table list header (row 8)
  const headerRowNum = sectionRow.number + 1;
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.values = [
    labels.rowNo,
    labels.tableLabel,
    labels.tableLogicalName,
    labels.columnsCount,
    labels.primaryKey,
    labels.foreignKeys,
    labels.indexes,
  ];
  styleColorRow(headerRow, COLOR.overviewBg, COLOR.overviewFg);
  applyBorderToRow(headerRow, COL_COUNT);

  // Data rows
  for (const [i, table] of doc.tables.entries()) {
    const indexes = collectTableIndexes(table, doc);
    const targetSheet = sheetNames.get(table.name)!;
    const row = sheet.addRow([
      i + 1,
      table.name,
      displayValue(table.comment, labels),
      table.columns.length,
      displayValue(table.primaryKeys.join(", "), labels),
      table.foreignKeys.length > 0
        ? table.foreignKeys
            .map((fk) => `${fk.columns.join(",")} → ${fk.referencedTable}`)
            .join("; ")
        : labels.none,
      indexes.length > 0
        ? indexes.map((idx) => idx.name).join("; ")
        : labels.none,
    ]);

    setHyperlink(row.getCell(2), table.name, targetSheet);
    row.getCell(2).font = { bold: true, color: { argb: COLOR.link }, underline: true };
    row.getCell(4).alignment = { horizontal: "center" };

    if (i % 2 === 1) {
      shadeRow(row, COL_COUNT, COLOR.altRow);
    }
    applyBorderToRow(row, COL_COUNT);
  }

  sheet.columns = [
    { width: 5 },
    { width: 28 },
    { width: 30 },
    { width: 9 },
    { width: 20 },
    { width: 38 },
    { width: 38 },
  ];

  sheet.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum + doc.tables.length, column: COL_COUNT },
  };
  sheet.views = [{ state: "frozen", ySplit: headerRowNum }];
}

// ── Per-table sheet ───────────────────────────────────────────────────────────

function populateTableSheet(
  sheet: ExcelJS.Worksheet,
  table: TableDoc,
  doc: DatabaseDoc,
  labels: OutputLabels
) {
  const indexes = collectTableIndexes(table, doc);

  // Row 1: table title
  sheet.mergeCells(1, 1, 1, 6);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = table.name;
  titleCell.font = { bold: true, size: 13, color: { argb: COLOR.overviewFg } };
  titleCell.fill = solidFill(COLOR.headerBg);
  titleCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  sheet.getRow(1).height = 26;

  // Row 2: back link
  const backRow = sheet.addRow([labels.backToOverview]);
  setHyperlink(backRow.getCell(1), labels.backToOverview, "Overview");
  backRow.getCell(1).font = { color: { argb: COLOR.link }, underline: true, size: 10 };

  sheet.addRow([]);

  // Metadata block
  const metaData: [string, string][] = [
    [labels.tablePhysicalName, table.name],
    [labels.tableLogicalName, displayValue(table.comment, labels)],
    ...(table.schema ? [[labels.schema, table.schema] as [string, string]] : []),
    [labels.columnsCount, String(table.columns.length)],
    [labels.primaryKey, displayValue(table.primaryKeys.join(", "), labels)],
    [
      labels.foreignKeys,
      table.foreignKeys.length > 0
        ? table.foreignKeys
            .map((fk) => {
              const name = fk.name ? ` (${fk.name})` : "";
              return `${fk.columns.join(", ")} → ${fk.referencedTable}.${fk.referencedColumns.join(", ")}${name}`;
            })
            .join("; ")
        : labels.none,
    ],
    [
      labels.indexes,
      indexes.length > 0
        ? indexes
            .map(
              (idx) =>
                `${idx.name} (${idx.columns.join(", ")})${idx.unique ? " UNIQUE" : ""}`
            )
            .join("; ")
        : labels.none,
    ],
  ];

  for (const [field, value] of metaData) {
    const row = sheet.addRow([field, value]);
    styleMetaRow(row);
    applyBorderToRow(row, 2);
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }

  sheet.addRow([]);

  // Column definition header
  const headerRow = sheet.addRow([
    labels.physicalName,
    labels.logicalName,
    labels.type,
    labels.required,
    labels.defaultValue,
    labels.notes,
  ]);
  styleColorRow(headerRow, COLOR.headerBg, COLOR.headerFg);
  applyBorderToRow(headerRow, 6);

  const headerRowNum = headerRow.number;

  // Column data rows
  for (const [i, column] of table.columns.entries()) {
    const markers: string[] = [];
    if (column.isPrimaryKey) markers.push(labels.pkMarker);
    if (column.isForeignKey) markers.push(labels.fkMarker);
    const notes = [markers.join(", "), column.description?.value ?? ""]
      .filter(Boolean)
      .join(" | ");

    const row = sheet.addRow([
      column.name,
      displayValue(column.comment, labels),
      column.type,
      column.nullable ? labels.no : labels.yes,
      column.defaultValue ?? "-",
      notes || "-",
    ]);

    if (column.isPrimaryKey) {
      shadeRow(row, 6, COLOR.pkBg);
      row.getCell(1).font = { bold: true };
    } else if (column.isForeignKey) {
      shadeRow(row, 6, COLOR.fkBg);
    } else if (i % 2 === 1) {
      shadeRow(row, 6, COLOR.altRow);
    }

    row.getCell(4).alignment = { horizontal: "center" };
    applyBorderToRow(row, 6);
  }

  sheet.columns = [
    { width: 24 },
    { width: 28 },
    { width: 18 },
    { width: 10 },
    { width: 18 },
    { width: 36 },
  ];

  sheet.views = [{ state: "frozen", ySplit: headerRowNum }];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayValue(value: string | undefined, labels: OutputLabels): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : labels.none;
}

function buildSheetName(
  tableName: string,
  existing: Map<string, string>
): string {
  const base = tableName.slice(0, 31);
  if (![...existing.values()].includes(base)) return base;
  let suffix = 2;
  while (suffix < 100) {
    const candidate = `${tableName.slice(0, 28)}_${suffix}`;
    if (![...existing.values()].includes(candidate)) return candidate;
    suffix++;
  }
  return base;
}

function setHyperlink(
  cell: ExcelJS.Cell,
  text: string,
  sheetName: string
): void {
  const safe = sheetName.replace(/'/g, "''");
  cell.value = { text, hyperlink: `#'${safe}'!A1` };
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function styleMetaRow(row: ExcelJS.Row) {
  row.getCell(1).font = { bold: true, color: { argb: COLOR.metaFg } };
  row.getCell(1).fill = solidFill(COLOR.metaBg);
  row.getCell(2).fill = solidFill(COLOR.valueBg);
}

function styleColorRow(row: ExcelJS.Row, bgArgb: string, fgArgb: string) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: fgArgb } };
    cell.fill = solidFill(bgArgb);
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  row.height = 22;
}

function shadeRow(row: ExcelJS.Row, colCount: number, argb: string) {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).fill = solidFill(argb);
  }
}

function applyBorderToRow(row: ExcelJS.Row, colCount: number) {
  const border: ExcelJS.Border = { style: "thin", color: { argb: COLOR.border } };
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = {
      top: border,
      left: border,
      bottom: border,
      right: border,
    };
  }
}

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
