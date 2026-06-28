import { describe, expect, it } from "vitest";
import type { DatabaseDoc } from "../../src/core/model/database-doc";
import {
  getErDiagramMermaid,
  renderErDiagramHtmlPage,
  renderErDiagramMarkdown
} from "../../src/exporters/diagram/er-diagram-embed";
import { getOutputLabels } from "../../src/exporters/shared/output-labels";
import {
  renderErDiagramSvg,
  renderErDiagramPng
} from "../../src/exporters/diagram/er-diagram-svg";

const doc: DatabaseDoc = {
  dialect: "postgres",
  tables: [
    {
      name: "users",
      columns: [
        {
          name: "id",
          type: "integer",
          nullable: false,
          isPrimaryKey: true,
          isForeignKey: false
        }
      ],
      primaryKeys: ["id"],
      foreignKeys: [],
      indexes: [],
      reviewTodos: []
    },
    {
      name: "orders",
      columns: [
        {
          name: "id",
          type: "integer",
          nullable: false,
          isPrimaryKey: true,
          isForeignKey: false
        },
        {
          name: "user_id",
          type: "integer",
          nullable: false,
          isPrimaryKey: false,
          isForeignKey: true
        }
      ],
      primaryKeys: ["id"],
      foreignKeys: [
        {
          columns: ["user_id"],
          referencedTable: "users",
          referencedColumns: ["id"]
        }
      ],
      indexes: [],
      reviewTodos: []
    }
  ],
  relationships: [
    {
      fromTable: "orders",
      fromColumn: "user_id",
      toTable: "users",
      toColumn: "id",
      source: "schema",
      needsReview: false
    }
  ],
  indexes: [],
  warnings: []
};

describe("ER diagram embed", () => {
  it("renders mermaid source with erDiagram header", () => {
    const mermaid = getErDiagramMermaid(doc);
    expect(mermaid).toContain("erDiagram");
    expect(mermaid).toContain("users");
    expect(mermaid).toContain("orders");
  });

  it("renders SVG with table boxes", async () => {
    const svg = await renderErDiagramSvg(doc);
    expect(svg).toContain("<svg");
    expect(svg).toContain("users");
    expect(svg).toContain("orders");
    expect(svg).toContain("<path");
  });

  it("renders PNG buffer from SVG", async () => {
    const png = await renderErDiagramPng(doc);
    expect(png.length).toBeGreaterThan(100);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("renders HTML page with mermaid class", () => {
    const html = renderErDiagramHtmlPage(getErDiagramMermaid(doc), getOutputLabels("en"));
    expect(html).toContain('class="mermaid"');
    expect(html).toContain("erDiagram");
    expect(html).toContain("index.html");
    expect(html).toContain('id="zoom-in"');
    expect(html).toContain('id="zoom-fit"');
    expect(html).toContain("setupPanZoom");
  });

  it("renders markdown mermaid fence", () => {
    const md = renderErDiagramMarkdown(getErDiagramMermaid(doc), {
      erDiagramHeading: "ER Diagram"
    } as never);
    expect(md).toContain("# ER Diagram");
    expect(md).toContain("```mermaid");
  });
});
