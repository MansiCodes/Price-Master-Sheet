export type PlantPnlResult = {
  salesRevenue: number;
  cogs: number;
  manpower: number;
  electricity: number;
  rent: number;
  pettyCash: number;
  depreciation: number;
  grossProfit: number;
  netProfit: number;
};

export type PnlLineKind =
  | "header"
  | "item"
  | "subtotal"
  | "profit"
  | "tax"
  | "blank";

export type PnlStatementLine = {
  label: string;
  amount: number | null;
  ratio: number | null;
  kind: PnlLineKind;
};

export type PlantPnlStatement = PlantPnlResult & {
  openingStock: number;
  closingStock: number;
  purchases: number;
  incomeTax: number;
  profitBeforeTax: number;
  trading: {
    debit: PnlStatementLine[];
    credit: PnlStatementLine[];
    total: number;
  };
  indirect: {
    debit: PnlStatementLine[];
    credit: PnlStatementLine[];
    total: number;
  };
};
