import type ExcelJS from "exceljs";
import {
  QUAD_SIGNAL_STOCK_CABLES,
  QUAD_SIGNAL_STOCK_RAW_MATERIALS,
  UPCAST_MISC_NATURES,
} from "@/lib/plant-catalogs";
import type { PlantFamily } from "./plant-family";

type InstructionsOpts = {
  name: string;
  code: string;
  family: PlantFamily;
  onlySP: boolean;
  salesCat: readonly string[];
  customers: readonly string[];
  purchaseCat: { suppliers: readonly string[]; goods: readonly string[] };
  stockCat: { particulars: readonly string[] };
  expenseHeads: readonly string[];
};

export function addInstructionsSheet(
  wb: ExcelJS.Workbook,
  opts: InstructionsOpts,
) {
  const {
    name,
    code,
    family,
    onlySP,
    salesCat,
    customers,
    purchaseCat,
    stockCat,
    expenseHeads,
  } = opts;

  const guide = wb.addWorksheet("Instructions");
  guide.addRow([`${name} (${code}) — P&L Excel Import Template`]);
  guide.getRow(1).font = { bold: true, size: 14, color: { argb: "FF0E5A54" } };
  guide.addRow([]);
  guide.addRow([
    "Columns match this plant's Today Entry / P&L forms. Other plants use a different template.",
  ]);
  guide.addRow([
    "1. Each data sheet has only the header row — start typing your values from row 2.",
  ]);
  guide.addRow([
    "2. Fill only the sheets you need → save → upload via Import Excel.",
  ]);
  guide.addRow([
    "3. Keep the green header row. Extra columns are ignored; missing columns stay blank.",
  ]);
  guide.addRow([
    "4. Dates: YYYY-MM-DD or DD/MM/YYYY. Sales/Purchase use Bill Date if Date is empty.",
  ]);
  guide.addRow([
    "5. Purchase sheet — column \"Purchase source\" (same as Today Entry form):",
  ]);
  guide.addRow([
    "   • Purchase from Vendor → put the real supplier in Supplier / Vendor's Name.",
  ]);
  guide.addRow([
    "   • Stock Taken from ATCL → set Purchase source to that (or put ATCL as supplier). App tags notes as \"Stock from ATCL\" and shows under Stock Taken from ATCL in P&L.",
  ]);
  if (onlySP) {
    guide.addRow([
      "6. Accountant login: only Sales and Purchase sheets are imported.",
    ]);
  } else {
    guide.addRow([
      "6. Expense — same as Today Entry form (Direct vs Indirect):",
    ]);
    guide.addRow([
      "   • Column \"Expense section\" = Direct Expense or Indirect Expense.",
    ]);
    guide.addRow([
      "   • Column \"Expense Head\" = which line under that section (e.g. Electricity, Salary & Wages, FAR).",
    ]);
    guide.addRow([
      "   • The app places the row on P&L using Expense Head (catalog: which heads are Direct vs Indirect).",
    ]);
    guide.addRow([
      "   • \"Nature\" is only extra detail (not Direct/Indirect). Prefer the dedicated sheets for Electricity / Rent / FAR when applicable.",
    ]);
    guide.addRow([
      `   • ${family === "pvc" ? "Fuel & Power" : "Electricity"} / Rent / FAR sheets still work for those heads.`,
    ]);
    if (family === "upcast" || family === "pvc") {
      guide.addRow(["   • Unloading of MT sheet → unloading charges."]);
    }
    guide.addRow([
      "7. Quantity × Rate is calculated in the app where formulas apply.",
    ]);
    if (family === "upcast") {
      guide.addRow([
        `8. Misc Exp. natures: ${UPCAST_MISC_NATURES.join(", ")}`,
      ]);
    } else if (family === "cat6") {
      guide.addRow([
        "8. CAT-6 purchase has no GST % column. Sales can use In Meter / QTY-MTR.",
      ]);
    } else if (family === "pvc") {
      guide.addRow([
        "8. Stock Category: RM / WIP / FG. Fuel & Power sheet is for electricity-style entries.",
      ]);
    } else if (family === "quadsignal") {
      guide.addRow([
        "8. Quad + Signal Plant — Purchase: fill Raw Material first, then Vendor's Name (vendors depend on material). Debit Qty is optional.",
      ]);
      guide.addRow([
        "   Sales Item Details include both Signalling cables / RDSO and Railway Quad / Star Quad products.",
      ]);
      guide.addRow([
        "   Stock sheet columns match Today Entry + P&L Stock tabs:",
      ]);
      guide.addRow([
        "   • Stock type = Raw Material or Cable (same as form).",
      ]);
      guide.addRow([
        "   • Item = raw material name (RM list) or cable type. Size required for Cable.",
      ]);
      guide.addRow([
        "   • Qty / Unit / Rate / Value = same as form (Value = Qty × Rate if Rate blank and Value filled).",
      ]);
      guide.addRow([
        "   • Cable: fill today's Production in process columns (Conductor/Insulation/Laying, …). Opening/closing calculated in app. Drum length, Call putup, Put up date, Party name, Dispatch pending, Dispatch party optional.",
      ]);
      guide.addRow([
        `   • Raw materials: ${QUAD_SIGNAL_STOCK_RAW_MATERIALS.filter((x) => x !== "Other").slice(0, 10).join(" · ")}…`,
      ]);
      guide.addRow([
        `   • Cables: ${QUAD_SIGNAL_STOCK_CABLES.filter((x) => x !== "Other").join(" · ")}`,
      ]);
    }
  }
  guide.addRow([]);
  guide.addRow(["Suggested values for this plant (optional — free text also works)"]);
  guide.getRow(guide.rowCount).font = { bold: true };
  guide.addRow([`Sales items: ${salesCat.slice(0, 12).join(" · ")}`]);
  guide.addRow([`Customers: ${customers.slice(0, 12).join(" · ")}`]);
  guide.addRow([`Purchase suppliers: ${purchaseCat.suppliers.slice(0, 10).join(" · ")}`]);
  guide.addRow([`Purchase goods: ${purchaseCat.goods.slice(0, 12).join(" · ")}`]);
  if (!onlySP) {
    guide.addRow([
      `Stock items: ${stockCat.particulars.slice(0, 12).join(" · ")}`,
    ]);
  guide.addRow([`Expense heads: ${expenseHeads.join(" · ")}`]);
    guide.addRow([
      "Expense section values: Direct Expense · Indirect Expense (pick head that belongs to that section)",
    ]);
    if (family === "upcast") {
      guide.addRow([`Misc natures: ${UPCAST_MISC_NATURES.join(" · ")}`]);
    }
  }
  guide.getColumn(1).width = 120;
}
