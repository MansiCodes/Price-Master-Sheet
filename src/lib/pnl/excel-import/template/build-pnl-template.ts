import ExcelJS from "exceljs";
import {
  getCustomerCatalog,
  getExpenseHeads,
  getPurchaseCatalog,
  getSalesCatalog,
  getStockCatalog,
} from "@/lib/plant-catalogs";
import { plantFamily } from "./plant-family";
import {
  electricityHeaders,
  farHeaders,
  miscExpenseHeaders,
  purchaseHeaders,
  rentHeaders,
  stockHeaders,
  unloadingHeaders,
} from "./template-headers";
import { addInstructionsSheet } from "./template-instructions";
import { addSalesSheet } from "./template-sales";
import { addSheet } from "./template-styles";

export type PnlTemplateOptions = {
  plantCode: string;
  plantName?: string | null;
  /** Accountants: only Sales + Purchase sheets. */
  salesPurchaseOnly?: boolean;
};

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
  addSalesSheet(wb, family);

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
  addInstructionsSheet(wb, {
    name,
    code,
    family,
    onlySP,
    salesCat,
    customers,
    purchaseCat,
    stockCat,
    expenseHeads,
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
