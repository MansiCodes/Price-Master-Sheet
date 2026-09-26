import { PRODUCT_UNITS, CAT6_LINE_UNITS } from "@/lib/units";
import { PVC_FAR_VENDORS, QUAD_SIGNAL_STOCK_RAW_MATERIALS } from "@/lib/plant-catalogs";

export function buildFarVendorOptions(customFarVendors: string[]) {
  const base = (PVC_FAR_VENDORS as readonly string[]).filter((x) => x !== "Other" && x !== "Others");
  const custom = customFarVendors.filter((x) => x !== "Other" && x !== "Others");
  return Array.from(new Set([...base, ...custom, "Other"]));
}

export function buildSupplierOptions(baseList: readonly string[], customSuppliers: readonly string[]) {
  const base = baseList.filter((x) => x !== "Other" && x !== "Others");
  const custom = customSuppliers.filter((x) => x !== "Other" && x !== "Others");
  return Array.from(new Set([...base, ...custom, "Other"]));
}

export function buildCustomerOptions(customers: readonly string[], customCustomers: readonly string[]) {
  const base = customers.filter((x) => x !== "Other" && x !== "Others");
  const custom = customCustomers.filter((x) => x !== "Other" && x !== "Others");
  const otherLabel = customers.includes("Others") ? "Others" : "Other";
  return Array.from(new Set([...base, ...custom, otherLabel]));
}

export function otherGoodsLabel(goods: readonly string[]) {
  if (goods.includes("others")) return "others";
  if (goods.includes("Others")) return "Others";
  return "Other";
}

export function buildPurchaseItemOptions(goods: readonly string[], customPurchaseItems: readonly string[]) {
  const base = goods.filter((x) => x && x !== "Other" && x !== "Others" && x !== "others");
  const custom = customPurchaseItems.filter(
    (x) => x && x !== "Other" && x !== "Others" && x !== "others",
  );
  return Array.from(new Set(["", ...base, ...custom, otherGoodsLabel(goods)]));
}

export function otherSaleLabel(saleProducts: readonly string[]) {
  if (saleProducts.includes("others")) return "others";
  if (saleProducts.includes("Others")) return "Others";
  if (saleProducts.includes("Other")) return "Other";
  return "Other";
}

export function buildSaleItemOptions(saleProducts: readonly string[], customSaleItems: readonly string[]) {
  const base = saleProducts.filter((x) => x && x !== "Other" && x !== "Others" && x !== "others");
  const custom = customSaleItems.filter(
    (x) => x && x !== "Other" && x !== "Others" && x !== "others",
  );
  return Array.from(new Set([...base, ...custom, otherSaleLabel(saleProducts)]));
}

export function buildPurchaseUnitOptions(isCat6: boolean, customUnits: string[]) {
  const base = isCat6 ? [...CAT6_LINE_UNITS] : [...PRODUCT_UNITS];
  return Array.from(new Set([...base.filter((u) => u !== "Other"), ...customUnits, "Other"]));
}

export function buildSaleUnitOptions(isCat6: boolean, isPvc: boolean, customUnits: string[]) {
  const base = isCat6
    ? [...CAT6_LINE_UNITS]
    : isPvc
      ? ["KG", "MTR", "KM", "Other"]
      : [...PRODUCT_UNITS];
  return Array.from(new Set([...base.filter((u) => u !== "Other"), ...customUnits, "Other"]));
}

export function stockOtherUnitLabel(base: string[]) {
  if (base.includes("others")) return "others";
  if (base.includes("Other")) return "Other";
  return "Other";
}

export function buildStockUnitOptions(catalogUnits: readonly string[] | undefined, customUnits: readonly string[]) {
  const base = [...(catalogUnits ?? [])];
  const extra = base.includes("Other") || base.includes("others")
    ? [stockOtherUnitLabel(base)]
    : ["Other"];
  return Array.from(
    new Set([...base.filter((u) => u !== "Other" && u !== "others"), ...customUnits, "MTR", "KM", ...extra]),
  );
}

export function stockParticularsOtherLabel(source: readonly string[]) {
  if (source.includes("others")) return "others";
  if (source.includes("Others")) return "Others";
  return "Other";
}

export function buildStockParticulars(
  isQuad: boolean,
  catalogParticulars: readonly string[],
  customStockItems: readonly string[],
) {
  const source = isQuad ? QUAD_SIGNAL_STOCK_RAW_MATERIALS : catalogParticulars;
  const otherLabel = stockParticularsOtherLabel(source);
  const base = source.filter((x) => x !== "Other" && x !== "Others" && x !== "others");
  const custom = customStockItems.filter(
    (x) => x !== "Other" && x !== "Others" && x !== "others" && !x.includes(" · "),
  );
  return Array.from(new Set([...base, ...custom, otherLabel]));
}
