import { describe, expect, it } from "vitest";
import {
  extractCheckBounds,
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
});
