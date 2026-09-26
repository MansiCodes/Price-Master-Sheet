import { submitPurchase } from "@/components/today/hub/submit-purchase";
import { submitSale } from "@/components/today/hub/submit-sale";
import { submitContact } from "@/components/today/hub/submit-contact";
import { submitStockFromVm } from "@/components/today/hub/submit-entry-stock";
import { submitExpenseKind } from "@/components/today/hub/submit-entry-expense";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

function submitPurchaseFromVm(vm: TodayHubVm, fail: FailFn) {
  const { plantId, flags, purchase, session } = vm;
  return submitPurchase({
    plantId, entryDate: session.entryDate, shift: session.shift, isCat6: flags.isCat6,
    purchaseSource: purchase.purchaseSource, vendorName: purchase.vendorName,
    vendorNameOther: purchase.vendorNameOther, purchaseLines: purchase.purchaseLines,
    purchaseType: purchase.purchaseType, purchaseTypeOther: purchase.purchaseTypeOther,
    billNumber: purchase.billNumber, purchaseGstin: purchase.purchaseGstin,
    purchaseBooksDate: purchase.purchaseBooksDate, purchaseRemarks: purchase.purchaseRemarks,
    billPhotos: purchase.billPhotos, fail,
  });
}

function submitSaleFromVm(vm: TodayHubVm, fail: FailFn) {
  const { plantId, flags, sale, session } = vm;
  return submitSale({
    plantId, entryDate: session.entryDate, shift: session.shift, isCat6: flags.isCat6,
    customerName: sale.customerName, customerNameOther: sale.customerNameOther,
    saleLines: sale.saleLines, saleType: sale.saleType, saleTypeOther: sale.saleTypeOther,
    invoiceNo: sale.invoiceNo, saleRemarks: sale.saleRemarks, invoicePhotos: sale.invoicePhotos,
    fail,
  });
}

function submitContactFromVm(vm: TodayHubVm, fail: FailFn) {
  return submitContact({
    plantId: vm.plantId,
    contactName: vm.misc.contactName,
    contactPhone: vm.misc.contactPhone,
    contactCategory: vm.misc.contactCategory,
    contactDesignation: vm.misc.contactDesignation,
    fail,
  });
}

export async function submitEntry(
  vm: TodayHubVm,
  fail: FailFn,
  t: (key: string) => string,
): Promise<SubmitOutcome> {
  if (vm.kind === "purchase") return submitPurchaseFromVm(vm, fail);
  if (vm.kind === "sale") return submitSaleFromVm(vm, fail);
  if (vm.kind === "stock") return submitStockFromVm(vm, fail);
  if (vm.kind === "expense") return submitExpenseKind(vm, fail, t);
  if (vm.kind === "contactList") return submitContactFromVm(vm, fail);
  fail("Unknown entry type.");
  return { status: "failed" };
}
