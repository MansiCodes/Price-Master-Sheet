/**
 * Step 1 — Export plant segment RM + final product map to Excel.
 * Run: npx tsx scripts/export-plant-segments.ts
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import {
  flattenPlantSegmentRows,
  PLANT_SEGMENTS,
} from "../src/lib/plant-segments";

async function main() {
  const outDir = resolve(__dirname, "../exports");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "plant-rm-fg-step1.xlsx");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cable Junction";
  wb.created = new Date();

  const summary = wb.addWorksheet("Plants summary");
  summary.columns = [
    { header: "Order", key: "sortOrder", width: 8 },
    { header: "Code", key: "code", width: 14 },
    { header: "Plant", key: "name", width: 22 },
    { header: "RM summary (UI)", key: "rmSummary", width: 42 },
    { header: "RM count", key: "rmCount", width: 10 },
    { header: "FG count", key: "fgCount", width: 10 },
  ];
  for (const seg of [...PLANT_SEGMENTS].sort((a, b) => a.sortOrder - b.sortOrder)) {
    summary.addRow({
      sortOrder: seg.sortOrder,
      code: seg.code,
      name: seg.name,
      rmSummary: seg.rmSummary,
      rmCount: seg.rawMaterials.length,
      fgCount: seg.finalProducts.length,
    });
  }
  summary.getRow(1).font = { bold: true };

  const detail = wb.addWorksheet("RM and FG detail");
  detail.columns = [
    { header: "Order", key: "sortOrder", width: 8 },
    { header: "Plant code", key: "plantCode", width: 14 },
    { header: "Plant name", key: "plantName", width: 22 },
    { header: "Kind", key: "kind", width: 8 },
    { header: "Item name", key: "itemName", width: 44 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Note", key: "note", width: 28 },
  ];
  for (const row of flattenPlantSegmentRows()) {
    detail.addRow(row);
  }
  detail.getRow(1).font = { bold: true };
  detail.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 7 },
  };

  // One sheet per plant for easy review
  for (const seg of [...PLANT_SEGMENTS].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const ws = wb.addWorksheet(seg.code.slice(0, 28));
    ws.columns = [
      { header: "Kind", key: "kind", width: 8 },
      { header: "Item name", key: "itemName", width: 44 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Note", key: "note", width: 28 },
    ];
    for (const item of seg.rawMaterials) {
      ws.addRow({
        kind: "RM",
        itemName: item.name,
        unit: item.unit ?? "",
        note: item.note ?? "",
      });
    }
    for (const item of seg.finalProducts) {
      ws.addRow({
        kind: "FG",
        itemName: item.name,
        unit: item.unit ?? "",
        note: item.note ?? "",
      });
    }
    ws.getRow(1).font = { bold: true };
  }

  await wb.xlsx.writeFile(outPath);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
