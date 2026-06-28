import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
  ImageRun
} from "docx";
import type { OutputLanguage } from "../../core/config/schema";
import type {
  DatabaseDoc,
  TableDoc
} from "../../core/model/database-doc";
import { getOutputLabels } from "../shared/output-labels";
import {
  columnDefinitionHeaders,
  columnDefinitionRow
} from "../shared/column-definition";
import { getErDiagramMermaid } from "../diagram/er-diagram-embed";
import { renderErDiagramPng, fitErDiagramToBox } from "../diagram/er-diagram-svg";

export type WordExportOptions = {
  outDir: string;
  language?: OutputLanguage;
};

export async function exportWordDocument(
  doc: DatabaseDoc,
  options: WordExportOptions
): Promise<void> {
  try {
    await mkdir(options.outDir, { recursive: true });
    const labels = getOutputLabels(options.language);

    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(labels.docTitle)]
      })
    );

    // Overview
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(labels.overviewHeading)]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun(`${labels.dialectLabel}: ${doc.dialect}`)]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun(`${labels.tablesLabel}: ${doc.tables.length}`)]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun(`${labels.relationshipsLabel}: ${doc.relationships.length}`)]
      })
    );

    // ER Diagram section
    if (doc.tables.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(labels.erDiagramHeading)]
        })
      );

      try {
        const { buffer: png, width, height } = await renderErDiagramPng(doc);
        await writeFile(join(options.outDir, "er_diagram.png"), png);
        const fitted = fitErDiagramToBox(width, height, 620, 900);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: png,
                transformation: fitted,
                type: "png"
              })
            ]
          })
        );
      } catch {
        children.push(
          new Paragraph({
            children: [new TextRun(labels.viewErDiagram)]
          })
        );
      }

      const mermaid = getErDiagramMermaid(doc);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Mermaid source", bold: true })]
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: mermaid,
              font: "Courier New",
              size: 18
            })
          ]
        })
      );
    }

    // Table List section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(labels.tableListHeading)]
      })
    );

    if (doc.tables.length > 0) {
      const tableListRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: labels.tableLabel, bold: true })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: labels.descriptionLabel, bold: true })]
                })
              ]
            })
          ]
        })
      ];

      for (const table of doc.tables) {
        tableListRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(table.name)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun(
                        table.description?.value ?? table.comment ?? ""
                      )
                    ]
                  })
                ]
              })
            ]
          })
        );
      }

      children.push(new Table({ rows: tableListRows }));
    }

    // Table Details
    for (const table of doc.tables) {
      children.push(...renderTableDetail(table, doc, labels));
    }

    // Relationships section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(labels.relationshipsHeading)]
      })
    );

    if (doc.relationships.length > 0) {
      const relHeaderCells = [
        labels.fromTable,
        labels.fromColumn,
        labels.toTable,
        labels.toColumn,
        labels.constraint,
        labels.source,
        labels.needsReview
      ].map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true })]
              })
            ]
          })
      );

      const relRows = [new TableRow({ children: relHeaderCells })];

      for (const rel of doc.relationships) {
        relRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(rel.fromTable)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(rel.fromColumn)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(rel.toTable)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(rel.toColumn)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun(rel.constraintName ?? "")]
                  })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(rel.source)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun(rel.needsReview ? labels.yes : labels.no)]
                  })
                ]
              })
            ]
          })
        );
      }

      children.push(new Table({ rows: relRows }));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun(labels.none)]
        })
      );
    }

    // Warnings section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(labels.warningsHeading)]
      })
    );

    if (doc.warnings.length > 0) {
      const warnHeaderCells = [
        labels.severity,
        labels.code,
        labels.target,
        labels.message
      ].map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true })]
              })
            ]
          })
      );

      const warnRows = [new TableRow({ children: warnHeaderCells })];

      for (const warning of doc.warnings) {
        warnRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(warning.severity)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(warning.code)] })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun(warning.target ?? "")]
                  })
                ]
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun(warning.message)] })
                ]
              })
            ]
          })
        );
      }

      children.push(new Table({ rows: warnRows }));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun(labels.none)]
        })
      );
    }

    const wordDoc = new Document({
      sections: [{ children }]
    });

    const buffer = await Packer.toBuffer(wordDoc);
    await writeFile(join(options.outDir, "database_document.docx"), buffer);
  } catch (err) {
    throw new Error(
      `Failed to export Word document: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }
}

function renderTableDetail(
  table: TableDoc,
  doc: DatabaseDoc,
  labels: ReturnType<typeof getOutputLabels>
): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const indexes = collectTableIndexes(table, doc);

  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun(table.name)]
    })
  );

  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun(labels.tableInfoHeading)]
    })
  );
  items.push(
    renderMetaTable([
      [labels.tablePhysicalName, table.name],
      [labels.tableLogicalName, table.comment ?? ""],
      [labels.schema, table.schema ?? ""],
      [labels.primaryKey, table.primaryKeys.join(", ") || labels.none],
      [
        labels.foreignKeys,
        table.foreignKeys.length > 0
          ? table.foreignKeys
              .map((fk) => {
                const name = fk.name ? ` (${fk.name})` : "";
                return `${fk.columns.join(", ")} -> ${fk.referencedTable}.${fk.referencedColumns.join(", ")}${name}`;
              })
              .join("; ")
          : labels.none
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
          : labels.none
      ]
    ])
  );

  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun(labels.columnsHeading)]
    })
  );
  items.push(renderColumnsTable(table, labels));

  // Page break between tables
  items.push(
    new Paragraph({
      children: [new TextRun("")]
    })
  );

  return items;
}

function renderColumnsTable(
  table: TableDoc,
  labels: ReturnType<typeof getOutputLabels>
): Table {
  const headerCells = columnDefinitionHeaders(labels).map(
    (h) =>
      new TableCell({
        children: [
          new Paragraph({ children: [new TextRun({ text: h, bold: true })] })
        ]
      })
  );

  const colRows = [new TableRow({ children: headerCells })];

  for (const col of table.columns) {
    colRows.push(
      new TableRow({
        children: columnDefinitionRow(col, labels).map(
          (value) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun(value)] })]
            })
        )
      })
    );
  }

  return new Table({ rows: colRows });
}

function renderLabelValueParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(`${label}: ${value}`)]
  });
}

function renderMetaTable(rows: Array<[string, string]>): Table {
  return new Table({
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true })]
                })
              ]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun(value)] })]
            })
          ]
        })
    )
  });
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
