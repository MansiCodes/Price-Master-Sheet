import type { LineItem, PurchaseTypeValue, SaleTypeValue, ShiftKey } from "@/components/today/today-hub-model";
import type { PvcStockEntryType } from "@/lib/plant-catalogs";
import type { FailFn } from "@/components/today/hub/submit-types";

export type SubmitPurchaseArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  isCat6: boolean;
  purchaseSource: "vendor" | "atcl";
  vendorName: string;
  vendorNameOther: string;
  purchaseLines: LineItem[];
  purchaseType: PurchaseTypeValue;
  purchaseTypeOther: string;
  billNumber: string;
  purchaseGstin: string;
  purchaseBooksDate: string;
  purchaseRemarks: string;
  billPhotos: string[];
  fail: FailFn;
};

export type SubmitSaleArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  isCat6: boolean;
  customerName: string;
  customerNameOther: string;
  saleLines: LineItem[];
  saleType: SaleTypeValue;
  saleTypeOther: string;
  invoiceNo: string;
  saleRemarks: string;
  invoicePhotos: string[];
  fail: FailFn;
};

export type SubmitStockOtherArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  resolvedItem: string;
  stockItem: string;
  stockItemOther: string;
  stockQty: string;
  isConductor: boolean;
  resolvedStockSize: string;
  stockSize: string;
  stockSizeOther: string;
  issuedQty: number;
  stockCategory: string;
  usesStockLedger: boolean;
  isCat6: boolean;
  isQuad: boolean;
  stockUnit: string;
  stockCatalogDefaultUnit: string;
  closingRate: number;
  closingValue: number;
  isUpcast: boolean;
  isPvc: boolean;
  stockType: PvcStockEntryType;
  stockNotes: string;
  stockPhotos: string[];
  upcastOpeningQty: string;
  upcastIncomingQty: string;
  upcastOutwardQty: string;
  upcastTotalScrapWeight: string;
  upcastPettyQty: string;
  upcastWeightPerPetty: string;
  upcastTotalPettyWeight: number;
  upcastSortingLossWeight: number;
  upcastBurningLossWeight: string;
  upcastWeightAfterBurning: number;
  upcastRod8mmWeight: string;
  upcastWire8mmTo1_6mmWeight: string;
  upcastWire1_6mmWeight: string;
  upcastTotalOutputWeight: number;
  upcastCastingLossWeight: number;
  fail: FailFn;
};

export type SubmitStockQuadRawArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  resolvedItem: string;
  stockItem: string;
  stockItemOther: string;
  stockQty: string;
  issuedQty: number;
  stockUnit: string;
  closingRate: number;
  closingValue: number;
  stockNotes: string;
  stockPhotos: string[];
  fail: FailFn;
};

export type SubmitExpenseLabourArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  expensePayMode: "Cash" | "Bank";
  isUpcast: boolean;
  paidTo: string;
  expenseDesc: string;
  expenseAmount: string;
  expensePhotos: string[];
  fail: FailFn;
};

export type SubmitExpenseSalaryArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  expensePayMode: "Cash" | "Bank";
  paidTo: string;
  expenseDesc: string;
  expenseAmount: string;
  expensePhotos: string[];
  fail: FailFn;
};

export type SubmitExpenseUpcastMiscArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  expensePayMode: "Cash" | "Bank";
  upcastMiscNature: string;
  paidTo: string;
  expenseDesc: string;
  expenseAmount: string;
  expensePhotos: string[];
  fail: FailFn;
};

export type SubmitExpensePettyArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  isCat6: boolean;
  pettyNature: string;
  pettyCashDescription: string;
  pettyPerson: string;
  pettyCashExpense: string;
  pettyLocation: string;
  pettyCheckedBy: string;
  pettyApprovedBy: string;
  pettyCashPhotos: string[];
  pettyCashPayMode: string;
  pettyCashContractorSalary: string;
  pettyCashSupervisorSalary: string;
  pettyCashBillNumber: string;
  fail: FailFn;
  enterPettyCashMsg: string;
};

export type SubmitExpenseGenericArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  expenseAmount: string;
  expenseHead: string;
  isCat6: boolean;
  isPvcStyleExpense: boolean;
  expensePayMode: "Cash" | "Bank";
  paidTo: string;
  expenseDesc: string;
  expensePhotos: string[];
  fail: FailFn;
  enterCategoryAmountMsg: string;
};

export type SubmitExpenseFactoryRentArgs = {
  plantId: string;
  rentCoveredArea: string;
  rentRatePerSqft: string;
  expenseAmount: string;
  expenseMonth: string;
  entryDate: string;
  shift: ShiftKey;
  expenseDesc: string;
  expensePayMode: "Cash" | "Bank";
  fail: FailFn;
};

export type SubmitExpenseElectricityArgs = {
  plantId: string;
  expenseOpeningReading: string;
  expenseClosingReading: string;
  expenseRate: string;
  expenseAmount: string;
  expenseMonth: string;
  entryDate: string;
  shift: ShiftKey;
  expenseHead: string;
  expenseDesc: string;
  expensePayMode: "Cash" | "Bank";
  fail: FailFn;
};

export type SubmitExpenseFarArgs = {
  plantId: string;
  farCost: string;
  farGst: string;
  farVendor: string;
  farVendorOther: string;
  farDescription: string;
  farBillNumber: string;
  entryDate: string;
  farDepPercent: string;
  fail: FailFn;
};

export type SubmitExpenseUnloadingArgs = {
  plantId: string;
  unloadQtyMt: string;
  calculatedUnloadMt: string;
  unloadRatePerMt: string;
  entryDate: string;
  shift: ShiftKey;
  expensePayMode: "Cash" | "Bank";
  paidTo: string;
  expenseDesc: string;
  expensePhotos: string[];
  fail: FailFn;
};
