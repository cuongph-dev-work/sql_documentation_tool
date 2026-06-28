import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { exportExcelDictionary } from "../../src/exporters/excel/excel-exporter";
import type { DatabaseDoc } from "../../src/core/model/database-doc";

const doc: DatabaseDoc = {
  dialect: "postgres",
  tables: [
    {
      name: "users",
      comment: "Users table",
      columns: [
        {
          name: "id",
          type: "integer",
          nullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: false
        }
      ],
      primaryKeys: ["id"],
      foreignKeys: [],
      indexes: [],
      reviewTodos: []
    }
  ],
  relationships: [],
  indexes: [],
  warnings: []
};

describe("exportExcelDictionary", () => {
  it("writes database_dictionary.xlsx with Overview sheet + one A5-style sheet per table", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    await exportExcelDictionary(doc, { outDir: dir, language: "jp" });

    const filePath = join(dir, "database_dictionary.xlsx");
    await expect(stat(filePath)).resolves.toMatchObject({
      size: expect.any(Number)
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readFile(filePath));

    expect(workbook.worksheets).toHaveLength(3);
    expect(workbook.worksheets[0]?.name).toBe("Overview");
    expect(workbook.worksheets[1]?.name).toBe("ER Diagram");
    expect(workbook.worksheets[2]?.name).toBe("users");

    const overview = workbook.worksheets[0]!;
    expect(overview.getCell("B9").value).toMatchObject({
      text: "users",
      hyperlink: "users!A1"
    });

    const tableSheet = workbook.worksheets[2]!;
    expect(tableSheet.getCell("A1").value).toBe("users");
    expect(tableSheet.getCell("A4").value).toBe("テーブル物理名");
    expect(tableSheet.getCell("B5").value).toBe("Users table");
    expect(tableSheet.getCell("A11").value).toBe("物理名");
    expect(tableSheet.getCell("A12").value).toBe("id");
    expect(tableSheet.getCell("E12").value).toBe("Yes");
    expect(tableSheet.getCell("J12").value).toBe("PK");

    await rm(dir, { recursive: true, force: true });
  });

  it("uses English labels by default and supports Japanese", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dbdocgen-"));
    const filePath = join(dir, "database_dictionary.xlsx");

    await exportExcelDictionary(doc, { outDir: dir });
    let workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readFile(filePath));
    const enTable = workbook.worksheets[2]!;
    expect(enTable.getCell("A4").value).toBe("Table Physical Name");
    expect(enTable.getCell("A11").value).toBe("Physical Name");

    await exportExcelDictionary(doc, { outDir: dir, language: "jp" });
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readFile(filePath));
    const jpTable = workbook.worksheets[2]!;
    expect(jpTable.getCell("A4").value).toBe("テーブル物理名");
    expect(jpTable.getCell("A11").value).toBe("物理名");

    await rm(dir, { recursive: true, force: true });
  });
});
