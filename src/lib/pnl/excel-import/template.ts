/** Build a blank multi-sheet P&L import template (.xlsx). */
import ExcelJS from "exceljs";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D9488" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
}

export async function buildPnlImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Cable Junction";
  wb.created = new Date();

  const sales = wb.addWorksheet("Sales");
  sales.addRow([
    "Date",
    "Shift",
    "Customer",
    "Bill Number",
    "Bill Date",
    "Item",
    "Unit",
    "Quantity",
    "Rate",
    "Type",
    "Notes",
  ]);
  styleHeader(sales.getRow(1));
  sales.addRow([
    "2026-09-01",
    "DAY",
    "Sample Customer",
    "INV-001",
    "2026-09-01",
    "CAT6 Cable",
    "mtr",
    100,
    12.5,
    "FINISHED_GOOD",
    "",
  ]);

  const purchase = wb.addWorksheet("Purchase");
  purchase.addRow([
    "Date",
    "Shift",
    "Vendor",
    "Bill Number",
    "Bill Date",
    "Item",
    "Unit",
    "Quantity",
    "Rate",
    "GST %",
    "Type",
    "Notes",
  ]);
  styleHeader(purchase.getRow(1));
  purchase.addRow([
    "2026-09-01",
    "DAY",
    "Sample Vendor",
    "BILL-001",
    "2026-09-01",
    "Copper Rod",
    "kg",
    50,
    800,
    18,
    "RAW_MATERIAL",
    "",
  ]);

  const stock = wb.addWorksheet("Stock");
  stock.addRow([
    "Date",
    "Shift",
    "Item",
    "Category",
    "Unit",
    "Quantity",
    "Rate",
    "Value",
    "Notes",
  ]);
  styleHeader(stock.getRow(1));
  stock.addRow([
    "2026-09-01",
    "DAY",
    "Copper Rod",
    "RM",
    "kg",
    20,
    800,
    "",
    "",
  ]);

  const expense = wb.addWorksheet("Expense");
  expense.addRow([
    "Date",
    "Shift",
    "Expense Head",
    "Nature",
    "Description",
    "Pay Mode",
    "Amount",
    "Contractor Salary",
    "Supervisor Salary",
    "Bill Number",
    "Opening Reading",
    "Closing Reading",
    "Vendor",
    "Cost",
    "GST",
    "Depreciation %",
    "Area Sqft",
    "Rent Rate",
  ]);
  styleHeader(expense.getRow(1));
  expense.addRow([
    "2026-09-01",
    "DAY",
    "Miscellaneous",
    "Tea & Snacks",
    "Factory tea",
    "Cash",
    500,
    0,
    0,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  expense.addRow([
    "2026-09-01",
    "DAY",
    "Electricity",
    "",
    "Sep bill",
    "Bank",
    12000,
    0,
    0,
    "",
    1000,
    1450,
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  expense.addRow([
    "2026-09-01",
    "DAY",
    "Factory Rent",
    "",
    "Monthly rent",
    "Bank",
    25000,
    0,
    0,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    2000,
    12.5,
  ]);
  expense.addRow([
    "2026-09-01",
    "DAY",
    "FAR",
    "",
    "New machine",
    "",
    0,
    0,
    0,
    "FAR-01",
    "",
    "",
    "ABC Machines",
    100000,
    18000,
    18.1,
    "",
    "",
  ]);

  const guide = wb.addWorksheet("Instructions");
  guide.addRow(["Cable Junction — P&L Excel Import"]);
  guide.addRow([]);
  guide.addRow([
    "1. Fill any of the sheets: Sales, Purchase, Stock, Expense. Leave unused sheets empty (or delete them).",
  ]);
  guide.addRow([
    "2. Keep the header row. Extra columns are ignored; missing columns stay blank.",
  ]);
  guide.addRow([
    "3. Quantity × Rate is calculated automatically (Sales value, Purchase basic/GST/invoice, Stock closing value).",
  ]);
  guide.addRow([
    "4. Expense Head decides the table: Electricity / Fuel & Power → Electricity; Factory Rent → Rent; FAR → Fixed Assets; everything else → Expense / Petty Cash.",
  ]);
  guide.addRow([
    "5. Each imported row stores the Excel upload date/time (shown in reports).",
  ]);
  guide.addRow(["6. Date format: YYYY-MM-DD or DD/MM/YYYY. Shift: DAY or NIGHT."]);
  guide.getColumn(1).width = 110;

  for (const ws of [sales, purchase, stock, expense]) {
    ws.columns.forEach((col) => {
      col.width = Math.max(12, Math.min(22, (col.header?.toString().length ?? 12) + 4));
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
