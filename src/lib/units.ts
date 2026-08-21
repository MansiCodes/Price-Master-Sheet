/** Shared unit options for Sales + Production (cable plant). */
export const PRODUCT_UNITS = [
  "PCS",
  "KGS",
  "NOS",
  "KM",
  "MTR",
  "COIL",
  "ROLL",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/** CAT-6 stock register units (Excel Stock sheet). */
export const CAT6_STOCK_UNITS = ["NOS", "ROLL"] as const;

export type Cat6StockUnit = (typeof CAT6_STOCK_UNITS)[number];

/** CAT-6 purchase / sale line units when restricted to Excel options. */
export const CAT6_LINE_UNITS = ["NOS", "ROLL"] as const;