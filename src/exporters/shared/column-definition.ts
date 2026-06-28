import type { ColumnDoc } from "../../core/model/database-doc";
import type { OutputLabels } from "./output-labels";

export const A5_COLUMN_COUNT = 10;

export function columnDefinitionHeaders(labels: OutputLabels): string[] {
  return [
    labels.physicalName,
    labels.logicalName,
    labels.type,
    labels.size,
    labels.required,
    labels.defaultValue,
    labels.minValue,
    labels.maxValue,
    labels.unique,
    labels.notes
  ];
}

export function formatColumnNotes(
  column: ColumnDoc,
  labels: OutputLabels
): string {
  const parts: string[] = [];
  if (column.isPrimaryKey) parts.push(labels.pkMarker);
  if (column.isForeignKey) parts.push(labels.fkMarker);
  if (column.constraintNotes?.length) parts.push(...column.constraintNotes);
  if (column.description?.value) parts.push(column.description.value);
  return parts.join(", ") || labels.none;
}

export function columnDefinitionRow(
  column: ColumnDoc,
  labels: OutputLabels
): string[] {
  return [
    column.name,
    column.comment ?? "",
    column.type,
    column.size ?? labels.none,
    column.nullable ? labels.no : labels.yes,
    column.defaultValue ?? labels.none,
    column.minValue ?? labels.none,
    column.maxValue ?? labels.none,
    column.isUnique ? labels.yes : labels.no,
    formatColumnNotes(column, labels)
  ];
}

export function displayCell(value: string, labels: OutputLabels): string {
  return value.trim() ? value : labels.none;
}
