import { type FormEvent, useEffect } from "react";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { runTodayHubSync } from "@/components/today/hub/run-today-hub-sync";
import {
  failTodayHub,
  resetTodayHubAll,
  submitTodayHubForm,
} from "@/components/today/hub/submit-today-hub-form";

export function useTodayHubActions(
  vm: TodayHubVm,
  t: (key: string) => string,
  router: { refresh: () => void },
) {
  async function runSync() {
    await runTodayHubSync(vm);
  }

  useEffect(() => {
    if (vm.plantId) {
      void runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.plantId, vm.date]);

  function fail(message: string) {
    failTodayHub(vm, message);
  }

  function resetAll() {
    resetTodayHubAll(vm);
  }

  async function onSubmit(e: FormEvent) {
    await submitTodayHubForm(e, vm, t, router, runSync);
  }

  return { onSubmit, fail, resetAll };
}
