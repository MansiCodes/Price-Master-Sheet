export type CableRate = {
  sNo: number | null;
  name: string;
  specification: string;
  specificationFull: string;
  /** Sheet “RM Costing (Per Box=305Mtr)” — shown as RM Costing Per Mtr in the app. */
  rmCostingPerMtr: number;
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
 * Default Master List indexes when header labels cannot be resolved.
 * A=S NO, B=Name, D=Description, J=RM Per Box (app: RM Costing Per Mtr),
 * L–O = #P=10% … #P=20%.
 */
export const SheetColumns = {
  S_NO: 0,
  NAME: 1,
  DESCRIPTION: 3,
  RM_COSTING_PER_MTR: 9,
  P10: 11,
  P12: 12,
  P15: 13,
  P20: 14,
} as const;

export type ResolvedSheetColumns = {
  sNo: number;
  name: number;
  description: number;
  rmCostingPerMtr: number;
  p10: number;
  p12: number;
  p15: number;
  p20: number;
};

export const CACHE_KEYS = {
  DAILY_RATES: "daily_rates",
  LAST_REFRESH_AT: "last_refresh_at",
} as const;
