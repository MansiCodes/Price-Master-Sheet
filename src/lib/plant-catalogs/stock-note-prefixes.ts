export const STOCK_CATEGORIES = ["RM", "WIP", "FG", "Other"] as const;

/** Notes prefix for inventory snapshot rows (P&L Opening / Closing Stock). */
export const STOCK_CLOSING_NOTE_PREFIX = "Closing stock";

/** Notes prefix for material received from ATCL (P&L → Stock Taken from ATCL). */
export const STOCK_ATCL_NOTE_PREFIX = "Stock from ATCL";
