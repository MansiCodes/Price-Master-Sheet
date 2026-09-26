import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type { SubmitStockOtherArgs } from "@/components/today/hub/submit-args";

export function validateStockOther(a: SubmitStockOtherArgs): SubmitOutcome | null {
  if (!a.resolvedItem || a.stockQty === "") {
    a.fail(
      (a.stockItem === "Others" || a.stockItem === "Other" || a.stockItem === "others") &&
        !a.stockItemOther.trim()
        ? "Enter the other item name."
        : "Enter stock category, item, and quantity.",
    );
    return { status: "failed" };
  }
  if (a.isConductor && !a.resolvedStockSize) {
    a.fail(a.stockSize === "others" && !a.stockSizeOther.trim() ? "Enter the other size." : "Select conductor size.");
    return { status: "failed" };
  }
  if (!(a.issuedQty >= 0)) {
    a.fail("Quantity must be zero or more.");
    return { status: "failed" };
  }
  return null;
}

export function stockOtherItemName(a: SubmitStockOtherArgs) {
  return a.resolvedStockSize ? `${a.resolvedItem} · ${a.resolvedStockSize}` : a.resolvedItem;
}

export function stockOtherUnit(a: SubmitStockOtherArgs) {
  if (a.usesStockLedger || a.isConductor) return a.stockUnit || "KGS";
  if (a.isCat6) return a.stockUnit || a.stockCatalogDefaultUnit || "NOS";
  return "kg";
}
