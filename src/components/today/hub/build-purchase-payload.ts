import {
  PVC_ATCL_PURCHASE_NOTE_PREFIX,
  PVC_ATCL_VENDOR_NAME,
} from "@/lib/plant-catalogs";
import type { LineItem, PurchaseTypeValue, ShiftKey } from "@/components/today/today-hub-model";

export function mapPurchaseItems(purchaseLines: LineItem[], isCat6: boolean) {
  return purchaseLines
    .map((l) => ({
      itemDescription: l.itemDescription.trim(),
      unit: l.unit.trim() || "KGS",
      quantity: Number(l.quantity),
      debitQuantity: l.debitQuantity ? Number(l.debitQuantity) : 0,
      openingReading: l.openingReading ? Number(l.openingReading) : null,
      closingReading: l.closingReading ? Number(l.closingReading) : null,
      rate: l.rate.trim() === "" ? 0 : Number(l.rate),
      gstPercent: isCat6 ? 0 : Number(l.gstPercent) || 0,
    }))
    .filter((l) => l.itemDescription && l.quantity > 0);
}

export function purchaseVendorName(
  purchaseSource: "vendor" | "atcl",
  resolvedVendorName: string,
) {
  return purchaseSource === "atcl" ? PVC_ATCL_VENDOR_NAME : resolvedVendorName;
}

export function purchaseNotes(purchaseSource: "vendor" | "atcl", purchaseRemarks: string) {
  if (purchaseSource !== "atcl") return purchaseRemarks.trim() || null;
  return (
    [PVC_ATCL_PURCHASE_NOTE_PREFIX, purchaseRemarks.trim()].filter(Boolean).join(" · ") ||
    PVC_ATCL_PURCHASE_NOTE_PREFIX
  );
}

export function buildPurchaseBody(args: {
  entryDate: string;
  shift: ShiftKey;
  isCat6: boolean;
  purchaseSource: "vendor" | "atcl";
  resolvedVendorName: string;
  purchaseType: PurchaseTypeValue;
  purchaseTypeOther: string;
  billNumber: string;
  purchaseGstin: string;
  purchaseBooksDate: string;
  purchaseRemarks: string;
  billPhotos: string[];
  items: ReturnType<typeof mapPurchaseItems>;
}) {
  return {
    date: args.entryDate,
    shift: args.shift,
    type: args.purchaseType,
    typeOther: args.purchaseType === "OTHERS" ? args.purchaseTypeOther.trim() : null,
    vendorName: purchaseVendorName(args.purchaseSource, args.resolvedVendorName),
    billNumber: args.billNumber || null,
    billDate: args.entryDate,
    gstin: args.isCat6 ? args.purchaseGstin.trim() || null : null,
    booksDate: args.isCat6 ? args.purchaseBooksDate || args.entryDate : null,
    notes: purchaseNotes(args.purchaseSource, args.purchaseRemarks),
    billPhotoUrls: args.billPhotos,
    items: args.items,
  };
}
