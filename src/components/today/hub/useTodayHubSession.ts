import { useEffect } from "react";
import { OPEN_TODAY_ENTRY_EVENT } from "@/lib/today-entry";
import type { ShiftModulesMap, TodayModuleStatus } from "@/components/today/today-hub-model";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import { useTodayHubSessionState } from "@/components/today/hub/useTodayHubSessionState";
import { useTodayHubSessionActions } from "@/components/today/hub/useTodayHubSessionActions";
import { mergeShiftModulesPreserveFilled } from "@/components/today/hub/apply-today-hub-checklist";

function useTodayHubOpenRequestEffect(
  canEnter: boolean,
  overlayOnly: boolean,
  date: string,
  today: string,
  openAdd: () => void,
) {
  useEffect(() => {
    if (!canEnter || overlayOnly) return;
    function onOpenRequest() { openAdd(); }
    window.addEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    return () => { window.removeEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest); };
    // openAdd closes over latest date/today/canEnter via render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEnter, date, today, overlayOnly]);
}

function useTodayHubChecklistSyncEffect(
  shiftModules: ShiftModulesMap,
  setChecklist: ReturnType<typeof useTodayHubSessionState>["setChecklist"],
) {
  useEffect(() => {
    setChecklist((prev) => mergeShiftModulesPreserveFilled(prev, shiftModules));
  }, [shiftModules]);
}

export function useTodayHubSession(
  flags: TodayHubFlags,
  date: string,
  shiftModules: ShiftModulesMap,
  plantId: string,
  canEnter: boolean,
  overlayOnly: boolean,
  externalOpen: boolean | undefined,
  onExternalOpenChange: ((open: boolean) => void) | undefined,
  t: (key: string) => string,
) {
  const state = useTodayHubSessionState(flags, date, shiftModules, t);
  const actions = useTodayHubSessionActions(state, plantId, date, externalOpen, onExternalOpenChange);
  const activeModules = state.checklist[state.reportShift].filter(
    (m) => m.key !== "productionFilled" && state.allowedModuleKeys.has(m.key),
  );
  useTodayHubOpenRequestEffect(canEnter, overlayOnly, date, state.today, actions.openAdd);
  useTodayHubChecklistSyncEffect(shiftModules, state.setChecklist);
  return { ...state, ...actions, activeModules, activeCompleted: activeModules.filter((m) => m.filled).length };
}

export type TodayHubSession = ReturnType<typeof useTodayHubSession>;
export type { TodayModuleStatus };
