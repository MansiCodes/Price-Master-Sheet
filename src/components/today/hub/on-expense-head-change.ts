import { PVC_UNLOADING_RATE_PER_MT } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function onExpenseHeadChange(vm: TodayHubVm, next: string) {
  const {
    expenseHeads,
    setExpenseHead,
    setExpenseOpeningReading,
    setExpenseClosingReading,
    setExpenseRate,
    unloadRatePerMt,
    setUnloadRatePerMt,
    setUnloadQtyMt,
    isCat6,
    expenseDesc,
    setExpenseDesc,
  } = bindExpenseLocals(vm);
  if (expenseHeads.length === 0) return;
  setExpenseHead(next);
  if (next !== "Electricity" && next !== "Fuel & Power") {
    setExpenseOpeningReading("");
    setExpenseClosingReading("");
    setExpenseRate("");
  }
  applyUnloadHeadDefaults(next, unloadRatePerMt, setUnloadRatePerMt, setUnloadQtyMt);
  if (isCat6 && next === "Miscellaneous" && !expenseDesc.trim()) {
    setExpenseDesc("Salary");
  }
}

function applyUnloadHeadDefaults(
  next: string,
  unloadRatePerMt: string,
  setUnloadRatePerMt: (v: string) => void,
  setUnloadQtyMt: (v: string) => void,
) {
  if (next === "Unloading of MT" || next === "Unloading MT") {
    if (!unloadRatePerMt) setUnloadRatePerMt(String(PVC_UNLOADING_RATE_PER_MT));
    return;
  }
  setUnloadQtyMt("");
  setUnloadRatePerMt(String(PVC_UNLOADING_RATE_PER_MT));
}
