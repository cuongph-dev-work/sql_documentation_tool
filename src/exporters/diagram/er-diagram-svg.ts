import type { DatabaseDoc, TableDoc } from "../../core/model/database-doc";
import {
  HEADER_H,
  LINE_H,
  getVisibleErColumns,
  layoutErDiagram,
  type Box
} from "./er-diagram-layout";

export type ErDiagramPng = {
  buffer: Buffer;
  width: number;
  height: number;
};

/** Render ER diagram SVG using ELK orthogonal layout (for PNG embed in Excel/Word). */
export async function renderErDiagramSvg(doc: DatabaseDoc): Promise<string> {
  const tables = doc.tables;
  if (tables.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><text x="10" y="40" font-family="Arial,sans-serif" font-size="14">No tables</text></svg>`;
  }

  const layout = await layoutErDiagram(doc);
  return buildErDiagramSvg(doc, layout);
}

export async function renderErDiagramPng(doc: DatabaseDoc): Promise<ErDiagramPng> {
  const tables = doc.tables;
  if (tables.length === 0) {
    const svg = await renderErDiagramSvg(doc);
    const sharp = (await import("sharp")).default;
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return { buffer, width: 400, height: 80 };
  }

  const layout = await layoutErDiagram(doc);
  const svg = buildErDiagramSvg(doc, layout);
  const sharp = (await import("sharp")).default;
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, width: layout.width, height: layout.height };
}

function buildErDiagramSvg(
  doc: DatabaseDoc,
  layout: Awaited<ReturnType<typeof layoutErDiagram>>
): string {
  const { boxes, edges, width, height } = layout;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="Arial,sans-serif" font-size="11">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#5b7aa6"/></marker></defs>`,
    `<g class="edges">`
  ];

  for (const edge of edges) {
    if (edge.points.length < 2) continue;
    const d = pointsToPath(edge.points);
    parts.push(
      `<path d="${d}" fill="none" stroke="#7d96b8" stroke-width="1.25" marker-end="url(#arrow)"/>`
    );
  }

  parts.push(`</g><g class="nodes">`);

  for (const table of doc.tables) {
    const box = boxes.get(table.name)!;
    parts.push(...renderTableBox(table, box));
  }

  parts.push("</g></svg>");
  return parts.join("");
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function renderTableBox(table: TableDoc, box: Box): string[] {
  const parts: string[] = [
    `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#f8fafc" stroke="#4472c4" stroke-width="1.5" rx="4"/>`,
    `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${HEADER_H}" fill="#4472c4" rx="4"/>`,
    `<rect x="${box.x}" y="${box.y + HEADER_H - 4}" width="${box.w}" height="4" fill="#4472c4"/>`,
    `<text x="${box.x + 8}" y="${box.y + 18}" fill="#ffffff" font-weight="bold">${escapeXml(table.name)}</text>`
  ];

  let cy = box.y + HEADER_H + 14;
  const visible = getVisibleErColumns(table);
  for (const col of visible) {
    const marker = col.isPrimaryKey ? " PK" : col.isForeignKey ? " FK" : "";
    parts.push(
      `<text x="${box.x + 8}" y="${cy}" fill="#333333">${escapeXml(col.name)} : ${escapeXml(shortType(col.type))}${marker}</text>`
    );
    cy += LINE_H;
  }
  if (table.columns.length > visible.length) {
    parts.push(
      `<text x="${box.x + 8}" y="${cy}" fill="#666666">... +${table.columns.length - visible.length} more</text>`
    );
  }

  return parts;
}

function shortType(type: string): string {
  return type.length > 18 ? `${type.slice(0, 15)}...` : type;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fitErDiagramToBox(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}
