export type ShiftDetailsTab = "sales" | "purchases" | "stock" | "expenses";

export type ShiftDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  plantName: string;
  date: string;
  shift: string;
  plantId: string;
};

export type SaleDetail = {
  id: string;
  customerName: string;
  itemDescription: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  salesValue: number | string;
};

export type PurchaseDetail = {
  id: string;
  vendorName: string;
  billNumber?: string | null;
  itemDescription: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  basicValue: number | string;
  invoiceValue: number | string;
};

export type StockDetail = {
  id: string;
  itemName: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  closingValue: number | string;
};

export type PettyCashDetail = {
  id: string;
  expenseHead: string;
  payMode: string;
  description: string | null;
  amount: number | string;
  contractorSalary: number | string;
  supervisorSalary: number | string;
};

export type ShiftDetailsData = {
  sales: SaleDetail[];
  purchases: PurchaseDetail[];
  stocks: StockDetail[];
  pettyCash: PettyCashDetail[];
};
