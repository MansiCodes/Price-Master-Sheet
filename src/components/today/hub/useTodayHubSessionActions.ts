import { readStoredEntryDate } from "@/lib/today-entry";
import type { EntryKind, ShiftKey, TodayModuleKey } from "@/components/today/today-hub-model";
import type { TodayHubSessionState } from "@/components/today/hub/useTodayHubSessionState";
import {
  applyChecklistShifts,
  fetchTodayChecklistJson,
  markShiftModuleFilled,
  type ChecklistJson,
} from "@/components/today/hub/apply-today-hub-checklist";

function createSetPanelOpen(
  externalOpen: boolean | undefined,
  onExternalOpenChange: ((open: boolean) => void) | undefined,
  setOpen: (next: boolean) => void,
) {
  return (next: boolean) => {
    if (externalOpen != null) onExternalOpenChange?.(next);
    else setOpen(next);
  };
}

function createOpenAdd(args: {
  setError: (v: string | null) => void;
  setKind: (k: EntryKind) => void;
  setShift: (s: "DAY" | "NIGHT") => void;
  setEntryDate: (d: string) => void;
  setPanelOpen: (n: boolean) => void;
  reportShift: ShiftKey;
  date: string;
  today: string;
}) {
  return (nextKind: EntryKind = "purchase", nextShift: ShiftKey = args.reportShift) => {
    args.setError(null);
    args.setKind(nextKind);
    args.setShift(nextShift);
    args.setEntryDate(readStoredEntryDate() || args.date || args.today);
    args.setPanelOpen(true);
  };
}

export function useTodayHubSessionActions(
  state: TodayHubSessionState,
  plantId: string,
  date: string,
  externalOpen: boolean | undefined,
  onExternalOpenChange: ((open: boolean) => void) | undefined,
) {
  const { today, setOpen, setKind, setShift, setEntryDate, setError, setChecklist, reportShift, open } = state;
  const setPanelOpen = createSetPanelOpen(externalOpen, onExternalOpenChange, setOpen);
  const openAdd = createOpenAdd({
    setError, setKind, setShift, setEntryDate, setPanelOpen, reportShift, date, today,
  });
  const markModuleFilled = (moduleKey: TodayModuleKey, entryShift: ShiftKey) => {
    setChecklist((prev) => markShiftModuleFilled(prev, moduleKey, entryShift));
  };
  const applyChecklistJson = (json: ChecklistJson | undefined, applyCustoms: (data: NonNullable<typeof json>) => void) => {
    if (!json) return;
    applyCustoms(json);
    if (!json.shifts) return;
    setChecklist((prev) => applyChecklistShifts(prev, json));
  };
  const closePanel = () => { setPanelOpen(false); setKind("purchase"); setError(null); };
  return {
    setPanelOpen, openAdd, markModuleFilled,
    syncChecklistFromServer: () => fetchTodayChecklistJson(plantId, date),
    applyChecklistJson, closePanel, panelOpen: externalOpen ?? open,
  };
}
