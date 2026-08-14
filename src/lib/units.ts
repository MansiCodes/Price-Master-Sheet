/** Shared unit options for Sales + Production (cable plant). */
export const PRODUCT_UNITS = [
  "PCS",
  "KGS",
  "NOS",
  "KM",
  "MTR",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];
