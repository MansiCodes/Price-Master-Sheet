import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function bindStockLocals(vm: TodayHubVm) {
  return {
    ...vm.flags,
    ...vm.catalogs,
    ...vm.stock,
    ...vm.upcast,
    ...vm.quad,
  };
}

export function bindExpenseLocals(vm: TodayHubVm) {
  return {
    ...vm.flags,
    ...vm.catalogs,
    ...vm.expense,
    ...vm.misc,
    plantCode: vm.plantCode,
  };
}
