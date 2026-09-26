/** Conductor plant — purchase supplier name dropdown. */
export const CONDUCTOR_SUPPLIERS = [
  "Metatech CCR",
  "Yatharth",
  "Shreeram Nexa",
  "Bhawani",
  "Other",
] as const;

/** Conductor plant — purchase description dropdown. */
export const CONDUCTOR_PURCHASE_GOODS = [
  "Copper rod 8 mm",
  "Others",
] as const;

/** Conductor plant — sales customer dropdown. */
export const CONDUCTOR_CUSTOMERS = [
  "Quad + Signal",
  "CAT6",
  "PIJF",
  "FS Cable",
  "FA Cable",
  "Power Cable",
  "Signal Core",
  "Multi core",
  "Others",
] as const;

/** Conductor plant — sales conductor size dropdown (order fixed). */
export const CONDUCTOR_SALE_SIZES = [
  "1.4mm",
  "0.9mm",
  "1.8mm",
  "0.475mm",
  "0.445mm",
  "0.425mm",
  "0.457mm",
  "0.625mm",
  "0.62mm",
  "0.5mm",
  "0.495mm",
  "0.2mm",
  "0.3mm",
  "0.4mm",
  "0.45mm",
  "0.6mm",
  "1mm",
  "0.85mm",
  "others",
] as const;

/** Conductor plant — stock size dropdown (8mm first, then sales sizes). */
export const CONDUCTOR_STOCK_SIZES = [
  "8mm",
  ...CONDUCTOR_SALE_SIZES,
] as const;

/** Conductor plant — stock item dropdown. */
export const CONDUCTOR_STOCK_ITEMS = [
  "copper",
  "aluminium",
  "wire drawing lubricant",
  "copper scrap",
  "GADH",
  "others",
] as const;
