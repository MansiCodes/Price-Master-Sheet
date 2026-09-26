import ExcelJS from "exceljs";

export function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D9488" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 28;
}

export function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
) {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers);
  styleHeader(ws.getRow(1));
  // Data rows left blank — user fills from row 2
  headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(12, Math.min(28, h.length + 4));
  });
  return ws;
}
