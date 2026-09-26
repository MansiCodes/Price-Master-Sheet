export type StockRow = {
  id: string;
  date: string;
  notes?: string | null;
  itemName: string;
  category?: string | null;
  quantity: string | number;
  unit: string;
  rate?: string | number | null;
  closingValue: string | number;
  photoUrl?: string | null;
  photoUrls?: string[];
  excelUploadedAt?: string | null;
  approvedByHead?: boolean;
  approvedByAdmin?: boolean;
  approvalRequired?: boolean;
};
