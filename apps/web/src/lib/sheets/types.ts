export type CableRate = {
  sNo: number | null;
  name: string;
  specification: string;
  specificationFull: string;
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

/** Column indexes (0-based) for Master List: A…L */
export const SheetColumns = {
  S_NO: 0,
  NAME: 1,
  DESCRIPTION: 2,
  P10: 8,
  P12: 9,
  P15: 10,
  P20: 11,
} as const;

export const CACHE_KEYS = {
  DAILY_RATES: "daily_rates",
  LAST_REFRESH_AT: "last_refresh_at",
} as const;
