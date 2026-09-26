import type { TodayHubProps } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { useTodayHubCore } from "@/components/today/hub/useTodayHubCore";
import { useTodayHubActions } from "@/components/today/hub/useTodayHubActions";

export type { TodayHubVm };

export function useTodayHub(props: TodayHubProps) {
  const { vm, t, tCommon, router } = useTodayHubCore(props);
  const { onSubmit, fail, resetAll } = useTodayHubActions(vm, t, router);
  return { vm, t, tCommon, onSubmit, fail, resetAll };
}
