import { rememberCustomOption } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function rememberPurchaseCustoms(vm: TodayHubVm) {
  const vendor =
    vm.purchase.vendorName === "Other"
      ? vm.purchase.vendorNameOther.trim()
      : vm.purchase.vendorName.trim();
  rememberCustomOption(vm.catalogs.setCustomSuppliers, vendor);
  for (const l of vm.purchase.purchaseLines) {
    rememberCustomOption(vm.catalogs.setCustomPurchaseItems, l.itemDescription);
    rememberCustomOption(vm.catalogs.setCustomUnits, l.unit);
  }
  if (vm.expense.farVendor) {
    rememberCustomOption(
      vm.catalogs.setCustomFarVendors,
      vm.expense.farVendor === "Other" ? vm.expense.farVendorOther.trim() : vm.expense.farVendor,
    );
  }
}

export function rememberSaleCustoms(vm: TodayHubVm) {
  const customer =
    vm.sale.customerName === "Other" || vm.sale.customerName === "Others"
      ? vm.sale.customerNameOther.trim()
      : vm.sale.customerName.trim();
  rememberCustomOption(vm.catalogs.setCustomCustomers, customer);
  for (const l of vm.sale.saleLines) {
    rememberCustomOption(vm.catalogs.setCustomSaleItems, l.itemDescription);
    rememberCustomOption(vm.catalogs.setCustomUnits, l.unit);
  }
}

export function rememberStockCustoms(vm: TodayHubVm) {
  if (vm.flags.isQuad && vm.stock.stockKind === "cable") {
    const cableKey =
      vm.stock.stockCable === "Other" ? vm.stock.stockCableOther.trim() : vm.stock.stockCable.trim();
    const sizeKey =
      vm.stock.stockCableSize === "Other"
        ? vm.stock.stockCableSizeOther.trim()
        : vm.stock.stockCableSize.trim();
    if (cableKey && sizeKey) {
      rememberCustomOption(vm.catalogs.setCustomStockItems, `${cableKey} · ${sizeKey}`);
    }
  } else {
    rememberCustomOption(vm.catalogs.setCustomStockItems, vm.stock.resolvedStockItemName);
  }
  rememberCustomOption(vm.catalogs.setCustomUnits, vm.stock.stockUnit);
}

export function rememberExpenseCustoms(vm: TodayHubVm) {
  if (vm.expense.farVendor) {
    rememberCustomOption(
      vm.catalogs.setCustomFarVendors,
      vm.expense.farVendor === "Other" ? vm.expense.farVendorOther.trim() : vm.expense.farVendor,
    );
  }
}
