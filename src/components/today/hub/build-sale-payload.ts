import type { LineItem, SaleTypeValue, ShiftKey } from "@/components/today/today-hub-model";

export function mapSaleItems(saleLines: LineItem[], isCat6: boolean) {
  return saleLines
    .map((l) => ({
      itemDescription: l.itemDescription.trim(),
      unit: l.unit.trim() || "PCS",
      quantity: Number(l.quantity),
      rate: l.rate.trim() === "" ? 0 : Number(l.rate),
      ...(isCat6 ? { inMeter: null, qtyMtr: null, meterUnit: null } : {}),
    }))
    .filter((l) => l.itemDescription && l.quantity > 0);
}

export function resolvedCustomerName(customerName: string, customerNameOther: string) {
  return customerName === "Other" || customerName === "Others"
    ? customerNameOther.trim()
    : customerName.trim();
}

export function buildSaleBody(args: {
  entryDate: string;
  shift: ShiftKey;
  isCat6: boolean;
  resolvedCustomerName: string;
  saleType: SaleTypeValue;
  saleTypeOther: string;
  invoiceNo: string;
  saleRemarks: string;
  invoicePhotos: string[];
  items: ReturnType<typeof mapSaleItems>;
}) {
  return {
    date: args.entryDate,
    shift: args.shift,
    type: args.isCat6 ? "FINISHED_GOOD" : args.saleType,
    typeOther: !args.isCat6 && args.saleType === "OTHERS" ? args.saleTypeOther.trim() : null,
    customerName: args.resolvedCustomerName,
    billNumber: args.invoiceNo || null,
    billDate: args.entryDate,
    notes: args.saleRemarks.trim() || null,
    billPhotoUrls: args.invoicePhotos,
    items: args.items,
  };
}
