import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode } from "elkjs";
import type { DatabaseDoc, TableDoc } from "../../core/model/database-doc";

export const BOX_W = 200;
export const HEADER_H = 28;
export const LINE_H = 14;
export const MAX_COLS_SHOWN = 6;
export const COMPACT_THRESHOLD = 18;
const PAD = 24;
const CLUSTER_GAP = 56;

export type Box = { x: number; y: number; w: number; h: number };

export type ErEdge = {
  id: string;
  points: Array<{ x: number; y: number }>;
};

export type ErLayout = {
  boxes: Map<string, Box>;
  edges: ErEdge[];
  compact: boolean;
  width: number;
  height: number;
};

export function isCompactLayout(tableCount: number): boolean {
  return tableCount >= COMPACT_THRESHOLD;
}

/** Columns shown in ER boxes: PK/FK first, then others, capped at MAX_COLS_SHOWN. */
export function getVisibleErColumns(table: TableDoc): TableDoc["columns"] {
  const prioritized = [
    ...table.columns.filter((column) => column.isPrimaryKey),
    ...table.columns.filter(
      (column) => column.isForeignKey && !column.isPrimaryKey
    ),
    ...table.columns.filter(
      (column) => !column.isPrimaryKey && !column.isForeignKey
    )
  ];

  const unique = prioritized.filter(
    (column, index, columns) =>
      columns.findIndex((item) => item.name === column.name) === index
  );

  return unique.slice(0, MAX_COLS_SHOWN);
}

export function measureTableBox(table: TableDoc, _compact = false): { w: number; h: number } {
  const visible = getVisibleErColumns(table);
  const extra = table.columns.length > visible.length ? 1 : 0;
  return {
    w: BOX_W,
    h: HEADER_H + (visible.length + extra) * LINE_H + 8
  };
}

function buildAdjacency(doc: DatabaseDoc): Map<string, Set<string>> {
  const names = new Set(doc.tables.map((t) => t.name));
  const adj = new Map<string, Set<string>>();
  for (const name of names) adj.set(name, new Set());

  for (const rel of doc.relationships.filter((r) => r.source === "schema")) {
    if (!names.has(rel.fromTable) || !names.has(rel.toTable)) continue;
    adj.get(rel.fromTable)!.add(rel.toTable);
    adj.get(rel.toTable)!.add(rel.fromTable);
  }
  return adj;
}

function connectedComponents(tableNames: string[], adj: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const name of tableNames) {
    if (visited.has(name)) continue;
    const stack = [name];
    const component: string[] = [];
    visited.add(name);

    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of adj.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    component.sort();
    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

function sectionToPoints(section: {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  bendPoints?: Array<{ x: number; y: number }>;
}): Array<{ x: number; y: number }> {
  return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
}

function extractEdges(layouted: ElkNode): ErEdge[] {
  const edges: ErEdge[] = [];
  for (const edge of (layouted.edges ?? []) as ElkExtendedEdge[]) {
    for (const section of edge.sections ?? []) {
      edges.push({
        id: edge.id,
        points: sectionToPoints(section)
      });
    }
  }
  return edges;
}

async function layoutComponent(
  doc: DatabaseDoc,
  tableNames: string[],
  compact: boolean
): Promise<{ boxes: Map<string, Box>; edges: ErEdge[]; width: number; height: number }> {
  const elk = new ELK();
  const nameSet = new Set(tableNames);
  const tables = doc.tables.filter((t) => nameSet.has(t.name));
  const direction = tables.length >= 8 ? "DOWN" : "RIGHT";

  const children = tables.map((table) => {
    const { w, h } = measureTableBox(table, compact);
    return { id: table.name, width: w, height: h };
  });

  const edges: Array<{ id: string; sources: string[]; targets: string[] }> = [];
  const seen = new Set<string>();
  for (const rel of doc.relationships.filter((r) => r.source === "schema")) {
    if (!nameSet.has(rel.fromTable) || !nameSet.has(rel.toTable)) continue;
    const key = `${rel.fromTable}->${rel.toTable}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      id: key,
      sources: [rel.fromTable],
      targets: [rel.toTable]
    });
  }

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.spacing.nodeNodeBetweenLayers": compact ? "56" : "80",
      "elk.spacing.nodeNode": compact ? "32" : "48",
      "elk.spacing.edgeNode": "24",
      "elk.padding": `[top=${PAD},left=${PAD},bottom=${PAD},right=${PAD}]`
    },
    children,
    edges
  };

  const layouted = await elk.layout(graph);
  const boxes = new Map<string, Box>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of layouted.children ?? []) {
    const table = tables.find((t) => t.name === child.id);
    if (!table) continue;
    const { w, h } = measureTableBox(table, compact);
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    const box: Box = { x, y, w, h };
    boxes.set(child.id, box);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  const width = Math.ceil(maxX - minX + PAD * 2);
  const height = Math.ceil(maxY - minY + PAD * 2);
  const dx = PAD - minX;
  const dy = PAD - minY;

  for (const [name, box] of boxes) {
    boxes.set(name, { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h });
  }

  const shiftedEdges = extractEdges(layouted).map((edge) => ({
    ...edge,
    points: edge.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
  }));

  return { boxes, edges: shiftedEdges, width, height };
}

function shiftLayout(
  boxes: Map<string, Box>,
  edges: ErEdge[],
  offsetX: number,
  offsetY: number
): void {
  for (const [name, box] of boxes) {
    boxes.set(name, { ...box, x: box.x + offsetX, y: box.y + offsetY });
  }
  for (const edge of edges) {
    for (const p of edge.points) {
      p.x += offsetX;
      p.y += offsetY;
    }
  }
}

/** ELK layered layout with orthogonal edge routing; tiles disconnected components. */
export async function layoutErDiagram(doc: DatabaseDoc): Promise<ErLayout> {
  const tables = doc.tables;
  if (tables.length === 0) {
    return {
      boxes: new Map(),
      edges: [],
      compact: false,
      width: 400,
      height: 80
    };
  }

  const compact = isCompactLayout(tables.length);
  const adj = buildAdjacency(doc);
  const components = connectedComponents(
    tables.map((t) => t.name),
    adj
  );

  const mergedBoxes = new Map<string, Box>();
  const mergedEdges: ErEdge[] = [];

  const clusterCols = components.length <= 1 ? 1 : components.length <= 4 ? 2 : 3;
  let tileX = 0;
  let tileY = 0;
  let rowHeight = 0;
  let maxWidth = PAD;
  let maxHeight = PAD;

  for (const [i, component] of components.entries()) {
    const laid = await layoutComponent(doc, component, compact);

    shiftLayout(laid.boxes, laid.edges, tileX, tileY);
    for (const [name, box] of laid.boxes) mergedBoxes.set(name, box);
    mergedEdges.push(...laid.edges);

    rowHeight = Math.max(rowHeight, laid.height);
    tileX += laid.width + CLUSTER_GAP;
    maxWidth = Math.max(maxWidth, tileX);
    maxHeight = Math.max(maxHeight, tileY + laid.height);

    if ((i + 1) % clusterCols === 0) {
      tileX = 0;
      tileY += rowHeight + CLUSTER_GAP;
      rowHeight = 0;
    }
  }

  return {
    boxes: mergedBoxes,
    edges: mergedEdges,
    compact,
    width: Math.ceil(maxWidth),
    height: Math.ceil(maxHeight + PAD)
  };
}
