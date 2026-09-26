import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import {
  rememberExpenseCustoms,
  rememberPurchaseCustoms,
  rememberSaleCustoms,
  rememberStockCustoms,
} from "@/components/today/hub/remember-kind-customs";

export function rememberSubmittedCustoms(vm: TodayHubVm) {
  if (vm.kind === "purchase") rememberPurchaseCustoms(vm);
  else if (vm.kind === "sale") rememberSaleCustoms(vm);
  else if (vm.kind === "stock") rememberStockCustoms(vm);
  else if (vm.kind === "expense") rememberExpenseCustoms(vm);
}
