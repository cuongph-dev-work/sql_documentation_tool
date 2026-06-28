import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import type { DatabaseDoc } from "../../core/model/database-doc";

export type ExportOptions = {
  outDir: string;
};

export async function exportExcelDictionary(
  doc: DatabaseDoc,
  options: ExportOptions
): Promise<void> {
  await mkdir(options.outDir, { recursive: true });
  const workbook = new ExcelJS.Workbook();

  const tableSheet = workbook.addWorksheet("01_Table_List");
  tableSheet.addRow([
    "Table",
    "Schema",
    "Comment",
    "Description",
    "Description Source",
    "Confidence",
    "Need Review",
    "Column Count",
    "PK"
  ]);
  for (const table of doc.tables) {
    tableSheet.addRow([
      table.name,
      table.schema ?? "",
      table.comment ?? "",
      table.description?.value ?? "",
      table.description?.source ?? "",
      table.description?.confidence ?? "",
      table.description?.needsReview ?? false,
      table.columns.length,
      table.primaryKeys.join(", ")
    ]);
  }

  const columnSheet = workbook.addWorksheet("02_Column_Dictionary");
  columnSheet.addRow([
    "Table",
    "Column",
    "Type",
    "Nullable",
    "Default",
    "PK",
    "FK",
    "DB Comment",
    "Description",
    "Description Source",
    "Confidence",
    "Need Review"
  ]);
  for (const table of doc.tables) {
    for (const column of table.columns) {
      columnSheet.addRow([
        table.name,
        column.name,
        column.type,
        column.nullable,
        column.defaultValue ?? "",
        column.isPrimaryKey,
        column.isForeignKey,
        column.comment ?? "",
        column.description?.value ?? "",
        column.description?.source ?? "",
        column.description?.confidence ?? "",
        column.description?.needsReview ?? false
      ]);
    }
  }

  const relationshipSheet = workbook.addWorksheet("03_Relationships");
  relationshipSheet.addRow([
    "From Table",
    "From Column",
    "To Table",
    "To Column",
    "Constraint Name",
    "Source",
    "Need Review"
  ]);
  for (const relationship of doc.relationships) {
    relationshipSheet.addRow([
      relationship.fromTable,
      relationship.fromColumn,
      relationship.toTable,
      relationship.toColumn,
      relationship.constraintName ?? "",
      relationship.source,
      relationship.needsReview
    ]);
  }

  const todoSheet = workbook.addWorksheet("08_Review_TODO");
  todoSheet.addRow(["Type", "Target", "Issue", "Suggestion", "Source"]);
  for (const table of doc.tables) {
    for (const todo of table.reviewTodos) {
      todoSheet.addRow([
        todo.type,
        todo.target,
        todo.issue,
        todo.suggestion ?? "",
        todo.source
      ]);
    }
  }

  const warningSheet = workbook.addWorksheet("09_Warnings");
  warningSheet.addRow(["Severity", "Code", "Target", "Message"]);
  for (const warning of doc.warnings) {
    warningSheet.addRow([
      warning.severity,
      warning.code,
      warning.target ?? "",
      warning.message
    ]);
  }

  await workbook.xlsx.writeFile(
    join(options.outDir, "database_dictionary.xlsx")
  );
}
