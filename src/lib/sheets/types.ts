export type CableRate = {
  sNo: number | null;
  name: string;
  specification: string;
  specificationFull: string;
  tab: string;
  hyperlink: string;
  /** Sheet “RM Costing” (e.g. 29662). */
  rmCosting: number;
  /** Sheet “RM Costing Per Mtr” (e.g. 29.66). */
  rmCostingPerMtr: number;
  /** Sheet “RM Costing (Per Box=305Mtr)” (e.g. 9046.97). */
  rmCostingPerBox: number;
  p10: number;
  p12: number;
  p15: number;
  p20: number;
};

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

export class SheetsError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = "SHEETS_ERROR") {
    super(message);
    this.name = "SheetsError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Master List fallback indexes (0-based). Header labels override these.
 * Live data: Per Box / P% are one column right of the older A–L layout
 * (Per Mtr at G, Per Box at I, P10–P20 at J–M).
 */
export const SheetColumns = {
  S_NO: 0,
  NAME: 1,
  DESCRIPTION: 2,
  TAB: 3,
  HYPERLINK: 4,
  RM_COSTING: 5,
  RM_COSTING_PER_MTR: 7,
  RM_COSTING_PER_BOX: 8,
  P10: 9,
  P12: 10,
  P15: 11,
  P20: 12,
} as const;

export type ResolvedSheetColumns = {
  sNo: number;
  name: number;
  description: number;
  tab: number;
  hyperlink: number;
  rmCosting: number;
  rmCostingPerMtr: number;
  rmCostingPerBox: number;
  p10: number;
  p12: number;
  p15: number;
  p20: number;
};

export const CACHE_KEYS = {
  DAILY_RATES: "daily_rates",
  LAST_REFRESH_AT: "last_refresh_at",
} as const;
