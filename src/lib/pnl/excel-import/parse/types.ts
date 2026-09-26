import type { ManpowerShift, PurchaseType, SaleType, StockCategory } from "@prisma/client";

export type ParsedSaleRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  type: SaleType;
  typeOther: string | null;
  customerName: string;
  billNumber: string | null;
  billDate: string | null;
  itemDescription: string;
  unit: string;
  quantity: number;
  rate: number;
  notes: string | null;
  inMeter?: number | null;
  qtyMtr?: number | null;
  meterUnit?: string | null;
};

export type ParsedPurchaseRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  type: PurchaseType;
  typeOther: string | null;
  vendorName: string;
  billNumber: string | null;
  billDate: string | null;
  itemDescription: string;
  unit: string;
  quantity: number;
  debitQuantity: number;
  rate: number;
  gstPercent: number;
  gstin: string | null;
  notes: string | null;
};

export type ParsedStockRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  itemName: string;
  category: StockCategory;
  unit: string;
  quantity: number;
  rate: number;
  notes: string | null;
  /** Quad + Signal cable/raw meta for QSSTOCK notes (optional). */
  qsKind?: "raw" | "cable";
  qsCable?: string;
  qsSize?: string;
  qsProduction?: Record<string, number>;
  qsSalesKm?: number;
  qsDrumLabel?: string | null;
  qsCallPutup?: string | null;
  qsPutupDate?: string | null;
  qsPartyName?: string | null;
  qsDispatchPending?: number;
  qsDispatchParty?: string | null;
};

export type ExpenseTarget = "petty" | "electricity" | "rent" | "far";

export type ParsedExpenseRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  target: ExpenseTarget;
  expenseHead: string;
  nature: string | null;
  description: string | null;
  payMode: string;
  amount: number;
  contractorSalary: number;
  supervisorSalary: number;
  billNumber: string | null;
  openingReading: number | null;
  closingReading: number | null;
  /** FAR fields */
  vendor: string | null;
  cost: number | null;
  gst: number | null;
  depreciationPercent: number | null;
  coveredAreaSqft: number | null;
  rentRatePerSqft: number | null;
};

export type ParseSkip = { sheet: string; row: number; reason: string };

export type ParsedPnlWorkbook = {
  sales: ParsedSaleRow[];
  purchases: ParsedPurchaseRow[];
  stock: ParsedStockRow[];
  expenses: ParsedExpenseRow[];
  skipped: ParseSkip[];
  sheetsFound: string[];
};

export type ColMap = Record<string, number>;

export type ParseWorkbookOpts = { plantCode?: string | null };
