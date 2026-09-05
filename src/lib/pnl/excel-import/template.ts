/**
 * Build a plant-specific multi-sheet P&L import template (.xlsx).
 * Columns mirror each plant's Today Entry / P&L forms.
 */
import ExcelJS from "exceljs";
import {
  getCustomerCatalog,
  getExpenseHeads,
  getPurchaseCatalog,
  getSalesCatalog,
  getStockCatalog,
  UPCAST_MISC_NATURES,
} from "@/lib/plant-catalogs";
import { isCat6Plant } from "@/lib/plant-layout";

export type PnlTemplateOptions = {
  plantCode: string;
  plantName?: string | null;
  /** Accountants: only Sales + Purchase sheets. */
  salesPurchaseOnly?: boolean;
};

type PlantFamily =
  | "upcast"
  | "pvc"
  | "cat6"
  | "conductor"
  | "default";

function plantFamily(code: string): PlantFamily {
  const c = code.trim().toUpperCase();
  if (c === "UPCAST") return "upcast";
  if (c === "PVC") return "pvc";
  if (isCat6Plant(c)) return "cat6";
  if (c === "CONDUCTOR") return "conductor";
  return "default";
}

function styleHeader(row: ExcelJS.Row) {
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

function addSheet(
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

function salesHeaders(family: PlantFamily): string[] {
  switch (family) {
    case "cat6":
      return [
        "Date",
        "Customer Name",
        "Bill Number",
        "Item Details",
        "In Meter",
        "QTY-MTR",
        "Unit",
        "Quantity",
        "Rate",
        "Remarks",
      ];
    case "conductor":
      return [
        "Date",
        "Type",
        "Customer",
        "Invoice no.",
        "Bill Date",
        "Conductor size",
        "Unit",
        "Quantity",
        "Rate",
        "Remarks",
      ];
    case "pvc":
      return [
        "Date",
        "Customer",
        "Invoice no.",
        "Bill Date",
        "Item Details",
        "Unit",
        "Quantity",
        "Rate",
        "Remarks",
      ];
    case "upcast":
      return [
        "Date",
        "Supplier Name",
        "Description of Goods",
        "Bill Number",
        "Bill Date",
        "Unit",
        "Quantity",
        "Rate",
        "Remarks",
      ];
    default:
      return [
        "Date",
        "Type",
        "Customer",
        "Invoice no.",
        "Bill Date",
        "Item Details",
        "Unit",
        "Quantity",
        "Rate",
        "Remarks",
      ];
  }
}

function purchaseHeaders(family: PlantFamily): string[] {
  switch (family) {
    case "cat6":
      return [
        "Date",
        "GSTIN/GST No",
        "Vendor's Name",
        "Bill Number",
        "Bill Date",
        "Item Details",
        "Unit",
        "Quantity",
        "Rate",
        "Notes",
      ];
    case "conductor":
      return [
        "Date",
        "Supplier name",
        "Description of Goods",
        "Invoice no. / Challan no.",
        "Bill Date",
        "Unit",
        "Quantity",
        "Rate",
        "GST %",
        "Remarks",
      ];
    case "pvc":
    case "upcast":
      return [
        "Date",
        "Supplier Name",
        "Description of Goods",
        "Bill Number",
        "Bill Date",
        "Unit",
        "Quantity",
        "Rate",
        "GST %",
        "Remarks",
      ];
    default:
      return [
        "Date",
        "Supplier name",
        "Description of Goods",
        "Invoice no. / Challan no.",
        "Bill Date",
        "Unit",
        "Quantity",
        "Rate",
        "GST %",
        "Remarks",
      ];
  }
}

function stockHeaders(family: PlantFamily): string[] {
  switch (family) {
    case "upcast":
      return [
        "Date",
        "Category",
        "Particulars",
        "Unit",
        "Issued quantity",
        "Rate",
        "Closing Value",
        "Notes",
      ];
    case "pvc":
      return [
        "Date",
        "Category",
        "Particulars",
        "Unit",
        "Closing Stock",
        "Rate",
        "Closing Value",
        "Notes",
      ];
    case "conductor":
      return [
        "Date",
        "Item",
        "Size",
        "Unit",
        "Quantity",
        "Rate",
        "Notes",
      ];
    case "cat6":
      return ["Date", "Item", "Unit", "Quantity", "Rate", "Notes"];
    default:
      return ["Date", "Item", "Unit", "Quantity", "Rate", "Notes"];
  }
}

function miscExpenseHeaders(family: PlantFamily): string[] {
  switch (family) {
    case "upcast":
      return [
        "Pay Mode",
        "Description of Expense",
        "Nature of Expense",
        "Payment Date",
        "Factory Expense",
        "Contractor Salary",
        "Supervisor Salary",
      ];
    case "pvc":
      return [
        "Date",
        "Expense Head",
        "Nature",
        "Description",
        "Pay Mode",
        "Amount",
        "Contractor Salary",
        "Supervisor Salary",
        "Remarks",
      ];
    case "cat6":
      return [
        "Date",
        "Expense Head",
        "Nature",
        "Description",
        "Location",
        "Person",
        "Checked by",
        "Approved by",
        "Pay Mode",
        "Amount",
        "Remarks",
      ];
    default:
      return [
        "Date",
        "Expense Head",
        "Nature",
        "Description",
        "Pay Mode",
        "Amount",
        "Remarks",
      ];
  }
}

function electricityHeaders(family: PlantFamily): string[] {
  if (family === "pvc") {
    return [
      "Months",
      "Opening Reading",
      "Closing Reading",
      "Rate",
      "Electricity / Fuel & Power Amt",
      "Notes",
    ];
  }
  return [
    "Months",
    "Opening Reading",
    "Closing Reading",
    "Rate",
    "Electricity Bill Amt",
    "Notes",
  ];
}

function rentHeaders(): string[] {
  return ["Months", "Covered Area", "Rate", "Rent Exp", "Notes"];
}

function farHeaders(): string[] {
  return [
    "Supplier Name",
    "Assets Description",
    "Bill Number",
    "Bill Date",
    "Billing Price",
    "GST",
    "Invoice Value",
    "Dep %",
    "Notes",
  ];
}

function unloadingHeaders(): string[] {
  return [
    "Date",
    "Quantity (MT)",
    "Rate (₹/MT)",
    "Paid to",
    "Pay Mode",
    "Amount",
    "Remarks",
  ];
}

export async function buildPnlImportTemplate(
  opts: PnlTemplateOptions,
): Promise<Buffer> {
  const code = (opts.plantCode || "").trim().toUpperCase() || "UPCAST";
  const family = plantFamily(code);
  const name = opts.plantName?.trim() || code;
  const onlySP = !!opts.salesPurchaseOnly;

  const salesCat = getSalesCatalog(code);
  const purchaseCat = getPurchaseCatalog(code);
  const stockCat = getStockCatalog(code);
  const customers = getCustomerCatalog(code);
  const expenseHeads = getExpenseHeads(code);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cable Junction";
  wb.created = new Date();
  wb.title = `${name} P&L Import Template`;

  // ── Sales ──────────────────────────────────────────────────────────
  addSheet(wb, "Sales", salesHeaders(family));

  // ── Purchase ───────────────────────────────────────────────────────
  addSheet(wb, "Purchase", purchaseHeaders(family));

  if (!onlySP) {
    addSheet(wb, "Stock", stockHeaders(family));
    addSheet(
      wb,
      family === "upcast" ? "Misc Exp." : "Expense",
      miscExpenseHeaders(family),
    );
    addSheet(
      wb,
      family === "pvc" ? "Fuel & Power" : "Electricity",
      electricityHeaders(family),
    );
    addSheet(wb, "Rent", rentHeaders());
    addSheet(wb, "FAR", farHeaders());
    if (family === "upcast" || family === "pvc") {
      addSheet(wb, "Unloading of MT", unloadingHeaders());
    }
  }

  // ── Instructions + catalogs ────────────────────────────────────────
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
  if (onlySP) {
    guide.addRow([
      "5. Accountant login: only Sales and Purchase sheets are imported.",
    ]);
  } else {
    guide.addRow([
      "5. Quantity × Rate is calculated in the app where formulas apply.",
    ]);
    if (family === "upcast") {
      guide.addRow([
        `6. Misc Exp. natures: ${UPCAST_MISC_NATURES.join(", ")}`,
      ]);
    } else if (family === "cat6") {
      guide.addRow([
        "6. CAT-6 purchase has no GST % column. Sales can use In Meter / QTY-MTR.",
      ]);
    } else if (family === "pvc") {
      guide.addRow([
        "6. Stock Category: RM / WIP / FG. Fuel & Power sheet is for electricity-style entries.",
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
    if (family === "upcast") {
      guide.addRow([`Misc natures: ${UPCAST_MISC_NATURES.join(" · ")}`]);
    }
  }
  guide.getColumn(1).width = 120;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
