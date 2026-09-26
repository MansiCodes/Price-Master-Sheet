import { useEffect, useMemo, useState } from "react";
import { todayLocalISO } from "@/lib/client-forms";
import {
  ENTRY_KIND_LABEL_KEY,
  type EntryKind,
  type ShiftKey,
  type ShiftModulesMap,
} from "@/components/today/today-hub-model";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";

export function useTodayHubSessionState(
  flags: TodayHubFlags, date: string, shiftModules: ShiftModulesMap, t: (key: string) => string,
) {
  const today = useMemo(() => todayLocalISO(), []);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<EntryKind>("purchase");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(shiftModules);
  const [reportShift, setReportShift] = useState<ShiftKey>("DAY");
  const [entryDate, setEntryDate] = useState(date || today);
  const [shift, setShift] = useState<"DAY" | "NIGHT">("DAY");
  const { allowedEntryKinds, allowedModuleKeys } = flags;
  const entryOptions = useMemo(
    () => allowedEntryKinds.map((value) => ({
      value, label: t(ENTRY_KIND_LABEL_KEY[value] as "purchase"),
    })),
    [t, allowedEntryKinds],
  );
  useEffect(() => {
    if (!allowedEntryKinds.includes(kind)) setKind(allowedEntryKinds[0] ?? "purchase");
  }, [allowedEntryKinds, kind]);
  return {
    today, open, setOpen, kind, setKind, saving, setSaving, error, setError,
    checklist, setChecklist, reportShift, setReportShift, entryDate, setEntryDate,
    shift, setShift, allowedEntryKinds, allowedModuleKeys, entryOptions,
  };
}

export type TodayHubSessionState = ReturnType<typeof useTodayHubSessionState>;
