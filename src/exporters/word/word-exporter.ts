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
  HeadingLevel
} from "docx";
import type {
  DatabaseDoc,
  TableDoc,
  ReviewTodo
} from "../../core/model/database-doc";

export type WordExportOptions = {
  outDir: string;
};

export async function exportWordDocument(
  doc: DatabaseDoc,
  options: WordExportOptions
): Promise<void> {
  try {
    await mkdir(options.outDir, { recursive: true });

    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("Database Documentation")]
      })
    );

    // Overview
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Overview")]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun(`Dialect: ${doc.dialect}`)]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun(`Tables: ${doc.tables.length}`)]
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun(`Relationships: ${doc.relationships.length}`)]
      })
    );

    // Table List section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Table List")]
      })
    );

    if (doc.tables.length > 0) {
      const tableListRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Table", bold: true })]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Description", bold: true })]
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
      children.push(...renderTableDetail(table, doc));
    }

    // Relationships section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Relationships")]
      })
    );

    if (doc.relationships.length > 0) {
      const relHeaderCells = [
        "From Table",
        "From Column",
        "To Table",
        "To Column",
        "Constraint",
        "Source",
        "Needs Review"
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
                    children: [new TextRun(rel.needsReview ? "Yes" : "No")]
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
          children: [new TextRun("(none)")]
        })
      );
    }

    // Warnings section
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Warnings")]
      })
    );

    if (doc.warnings.length > 0) {
      const warnHeaderCells = ["Severity", "Code", "Target", "Message"].map(
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
          children: [new TextRun("(none)")]
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
  doc: DatabaseDoc
): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];

  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun(`Table: ${table.name}`)]
    })
  );

  if (table.description?.value) {
    items.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Purpose")]
      })
    );
    items.push(
      new Paragraph({
        children: [new TextRun(table.description.value)]
      })
    );
  }

  if (table.comment) {
    items.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("DB Comment")]
      })
    );
    items.push(
      new Paragraph({
        children: [new TextRun(table.comment)]
      })
    );
  }

  // Columns
  if (table.columns.length > 0) {
    items.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun("Columns")]
      })
    );
    items.push(renderColumnsTable(table));
  }

  // Primary Keys
  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun("Primary Key")]
    })
  );

  if (table.primaryKeys.length > 0) {
    for (const pk of table.primaryKeys) {
      items.push(
        new Paragraph({
          children: [new TextRun(`• ${pk}`)]
        })
      );
    }
  } else {
    items.push(
      new Paragraph({
        children: [new TextRun("• (none)")]
      })
    );
  }

  // Foreign Keys
  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun("Foreign Keys")]
    })
  );

  if (table.foreignKeys.length > 0) {
    for (const fk of table.foreignKeys) {
      const name = fk.name ? ` (${fk.name})` : "";
      items.push(
        new Paragraph({
          children: [
            new TextRun(
              `• ${fk.columns.join(", ")} → ${fk.referencedTable}.${fk.referencedColumns.join(", ")}${name}`
            )
          ]
        })
      );
    }
  } else {
    items.push(
      new Paragraph({
        children: [new TextRun("• (none)")]
      })
    );
  }

  // Indexes
  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun("Indexes")]
    })
  );

  const tableIndexes = doc.indexes.filter((idx) => idx.table === table.name);
  const allIndexes = [
    ...table.indexes,
    ...tableIndexes.filter(
      (idx) => !table.indexes.some((ti) => ti.name === idx.name)
    )
  ];

  if (allIndexes.length > 0) {
    for (const idx of allIndexes) {
      const unique = idx.unique ? " UNIQUE" : "";
      items.push(
        new Paragraph({
          children: [
            new TextRun(`• ${idx.name} on (${idx.columns.join(", ")})${unique}`)
          ]
        })
      );
    }
  } else {
    items.push(
      new Paragraph({
        children: [new TextRun("• (none)")]
      })
    );
  }

  // Review TODOs
  items.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      children: [new TextRun("Review TODOs")]
    })
  );

  items.push(...renderReviewTodos(table.reviewTodos));

  // Page break between tables
  items.push(
    new Paragraph({
      children: [new TextRun("")]
    })
  );

  return items;
}

function renderColumnsTable(table: TableDoc): Table {
  const headerCells = [
    "Name",
    "Type",
    "Nullable",
    "Default",
    "PK",
    "FK",
    "Comment"
  ].map(
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
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun(col.name)] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun(col.type)] })]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(col.nullable ? "Yes" : "No")]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(col.defaultValue ?? "-")]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(col.isPrimaryKey ? "Yes" : "No")]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(col.isForeignKey ? "Yes" : "No")]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun(col.comment ?? "")] })
            ]
          })
        ]
      })
    );
  }

  return new Table({ rows: colRows });
}

function renderReviewTodos(todos: ReviewTodo[]): Paragraph[] {
  if (todos.length === 0) {
    return [
      new Paragraph({
        children: [new TextRun("• (none)")]
      })
    ];
  }

  return todos.map((todo) => {
    const sug = todo.suggestion ? ` — ${todo.suggestion}` : "";
    return new Paragraph({
      children: [
        new TextRun(`• [${todo.type}] ${todo.target}: ${todo.issue}${sug}`)
      ]
    });
  });
}
