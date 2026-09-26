import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export async function runTodayHubSync(vm: TodayHubVm) {
  const json = await vm.session.syncChecklistFromServer();
  vm.session.applyChecklistJson(json, (data) => {
    if (data.customSuppliers) vm.catalogs.setCustomSuppliers(data.customSuppliers);
    if (data.customCustomers) vm.catalogs.setCustomCustomers(data.customCustomers);
    if (data.customPurchaseItems) vm.catalogs.setCustomPurchaseItems(data.customPurchaseItems);
    if (data.customSaleItems) vm.catalogs.setCustomSaleItems(data.customSaleItems);
    if (data.customStockItems) vm.catalogs.setCustomStockItems(data.customStockItems);
    if (data.customFarVendors) vm.catalogs.setCustomFarVendors(data.customFarVendors);
    if (data.customUnits) vm.catalogs.setCustomUnits(data.customUnits);
  });
}
