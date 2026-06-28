import { describe, expect, it } from "vitest";
import {
  extractCheckBounds,
  extractColumnConstraintNotes,
  normalizeColumnType
} from "../../src/parsers/sql/column-meta";

describe("column-meta", () => {
  it("formats varchar and numeric types with size", () => {
    expect(normalizeColumnType({ dataType: "VARCHAR", length: 128 })).toEqual({
      type: "varchar(128)",
      size: "128"
    });
    expect(normalizeColumnType({ dataType: "NUMERIC", length: 12, scale: 2 })).toEqual({
      type: "numeric(12,2)",
      size: "12,2"
    });
  });

  it("extracts min and max from check expressions", () => {
    const bounds = extractCheckBounds(
      {
        type: "binary_expr",
        operator: "AND",
        left: {
          type: "binary_expr",
          operator: ">=",
          left: { type: "column_ref", column: "age" },
          right: { type: "number", value: 0 }
        },
        right: {
          type: "binary_expr",
          operator: "<=",
          left: { type: "column_ref", column: "age" },
          right: { type: "number", value: 150 }
        }
      },
      "age"
    );

    expect(bounds).toEqual({
      minValue: "0",
      maxValue: "150"
    });
  });

  it("extracts auto_increment, generated, and enum notes", () => {
    expect(
      extractColumnConstraintNotes({
        auto_increment: "auto_increment"
      })
    ).toEqual(["AUTO_INCREMENT"]);

    expect(
      extractColumnConstraintNotes({
        generated: {
          storage_type: "stored",
          expr: {
            type: "number",
            value: 0
          }
        }
      })
    ).toEqual(["GENERATED ALWAYS STORED: 0"]);

    expect(
      extractColumnConstraintNotes({
        definition: {
          dataType: "ENUM",
          expr: {
            type: "expr_list",
            value: [
              { type: "single_quote_string", value: "queued" },
              { type: "single_quote_string", value: "done" }
            ]
          }
        }
      })
    ).toEqual(["ENUM: queued, done"]);
  });
});
