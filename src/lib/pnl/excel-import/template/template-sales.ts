import type ExcelJS from "exceljs";
import { addSheet } from "./template-styles";
import type { PlantFamily } from "./plant-family";

export function salesHeaders(family: PlantFamily): string[] {
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
    case "quadsignal":
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

export function addSalesSheet(wb: ExcelJS.Workbook, family: PlantFamily) {
  addSheet(wb, "Sales", salesHeaders(family));
}
