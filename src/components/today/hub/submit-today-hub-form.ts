import type { FormEvent } from "react";
import { toast } from "sonner";
import { KIND_TO_MODULE } from "@/components/today/today-hub-model";
import { resetAllForms } from "@/components/today/hub/reset-today-hub-forms";
import { submitEntry } from "@/components/today/hub/submit-entry";
import { rememberSubmittedCustoms } from "@/components/today/hub/remember-custom-catalog-items";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function failTodayHub(vm: TodayHubVm, message: string) {
  vm.session.setSaving(false);
  vm.session.setError(message);
  toast.error(message);
}

export function resetTodayHubAll(vm: TodayHubVm) {
  resetAllForms({
    flags: vm.flags,
    catalogs: vm.catalogs,
    purchase: vm.purchase,
    sale: vm.sale,
    stock: vm.stock,
    expense: vm.expense,
    misc: vm.misc,
    plantCode: vm.plantCode,
    entryDate: vm.session.entryDate,
    today: vm.session.today,
    setShift: vm.session.setShift,
  });
}

export function successLabel(kind: TodayHubVm["kind"], t: (key: string) => string) {
  const labels = {
    purchase: t("purchaseSaved"),
    sale: t("salesSaved"),
    stock: t("stockSaved"),
    expense: t("expenseSaved"),
    contactList: "Contact saved",
  } as const;
  return labels[kind];
}

export async function submitTodayHubForm(
  e: FormEvent,
  vm: TodayHubVm,
  t: (key: string) => string,
  router: { refresh: () => void },
  runSync: () => Promise<void>,
) {
  e.preventDefault();
  vm.session.setSaving(true);
  vm.session.setError(null);
  const fail = (message: string) => failTodayHub(vm, message);
  const outcome = await submitEntry(vm, fail, t);
  if (outcome.status === "failed") return;
  vm.session.setSaving(false);
  if (!outcome.result.ok) {
    fail(outcome.result.error || "Could not save entry.");
    return;
  }
  toast.success(successLabel(vm.session.kind, t));
  rememberSubmittedCustoms(vm);
  vm.session.closePanel();
  resetTodayHubAll(vm);
  if (vm.session.kind !== "contactList" && vm.session.entryDate === vm.date) {
    const moduleKey = KIND_TO_MODULE[vm.session.kind];
    if (moduleKey) vm.session.markModuleFilled(moduleKey, vm.session.shift);
  }
  void runSync();
  router.refresh();
}
