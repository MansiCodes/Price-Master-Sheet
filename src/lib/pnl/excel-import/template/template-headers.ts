import { QUAD_STOCK_SHEET_HEADERS } from "@/lib/pnl/excel-import/quad-stock-columns";
import type { PlantFamily } from "./plant-family";

export function purchaseHeaders(family: PlantFamily): string[] {
  // Purchase source = same as Today Entry: "Purchase from Vendor" | "Stock Taken from ATCL"
  switch (family) {
    case "cat6":
      return [
        "Date",
        "Purchase source",
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
        "Purchase source",
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
        "Purchase source",
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
    case "quadsignal":
      return [
        "Date",
        "Purchase source",
        "Raw Material",
        "Vendor's Name",
        "Invoice no. / Challan no.",
        "Bill Date",
        "Unit",
        "Quantity",
        "Debit Qty",
        "Rate",
        "GST %",
        "Remarks",
      ];
    default:
      return [
        "Date",
        "Purchase source",
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

export function stockHeaders(family: PlantFamily): string[] {
  switch (family) {
    case "upcast":
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
    case "quadsignal":
      return [...QUAD_STOCK_SHEET_HEADERS];
    default:
      return ["Date", "Item", "Unit", "Quantity", "Rate", "Notes"];
  }
}

export function miscExpenseHeaders(family: PlantFamily): string[] {
  // Expense section + Expense Head mirror Today Entry (Direct / Indirect → which head).
  // "Nature" is only a sub-detail (e.g. UPCAST misc / petty) — not Direct vs Indirect.
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
        "Expense section",
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
        "Expense section",
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
        "Expense section",
        "Expense Head",
        "Nature",
        "Description",
        "Pay Mode",
        "Amount",
        "Remarks",
      ];
  }
}

export function electricityHeaders(family: PlantFamily): string[] {
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

export function rentHeaders(): string[] {
  return ["Months", "Covered Area", "Rate", "Rent Exp", "Notes"];
}

export function farHeaders(): string[] {
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

export function unloadingHeaders(): string[] {
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
