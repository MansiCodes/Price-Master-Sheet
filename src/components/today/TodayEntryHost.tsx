"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { todayLocalISO } from "@/lib/client-forms";
import { OPEN_TODAY_ENTRY_EVENT } from "@/lib/today-entry";
import {
  TodayHub,
  type ShiftModulesMap,
  type TodayModuleKey,
  type TodayModuleStatus,
} from "@/components/today/TodayHub";

const MODULES: { key: TodayModuleKey; label: string }[] = [
  { key: "purchaseFilled", label: "Purchase" },
  { key: "saleFilled", label: "Sales" },
  { key: "stockFilled", label: "Stock" },
  { key: "productionFilled", label: "Production" },
  { key: "pettyCashFilled", label: "Expense" },
];

function emptyShiftModules(): ShiftModulesMap {
  const empty = MODULES.map((m) => ({
    ...m,
    filled: false,
    done: 0,
    total: 1,
  }));
  return { DAY: empty, NIGHT: empty };
}

function toModuleList(
  modules: { key: TodayModuleKey; filled: boolean; label?: string }[],
): TodayModuleStatus[] {
  return MODULES.map((m) => {
    const remote = modules.find((row) => row.key === m.key);
    return {
      key: m.key,
      label: remote?.label ?? m.label,
      filled: remote?.filled ?? false,
      done: remote?.filled ? 1 : 0,
      total: 1,
    };
  });
}

type PlantInfo = {
  id: string;
  name: string;
  code: string;
};

/** Global slide-over entry form — opens from header on any page except dashboard. */
export function TodayEntryHost({
  plant,
  canEnter,
}: {
  plant: PlantInfo | null;
  canEnter: boolean;
}) {
  const pathname = usePathname();
  const date = useMemo(() => todayLocalISO(), []);
  const [shiftModules, setShiftModules] = useState<ShiftModulesMap>(
    emptyShiftModules,
  );
  const [open, setOpen] = useState(false);

  const enabled = Boolean(plant && canEnter && pathname !== "/");

  useEffect(() => {
    if (!enabled || !plant) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/plants/${plant.id}/today?date=${encodeURIComponent(date)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          shifts?: Record<
            "DAY" | "NIGHT",
            { modules: { key: TodayModuleKey; filled: boolean; label?: string }[] }
          >;
        };
        if (!json.shifts) return;
        setShiftModules({
          DAY: toModuleList(json.shifts.DAY.modules),
          NIGHT: toModuleList(json.shifts.NIGHT.modules),
        });
      } catch {
        // keep defaults
      }
    })();
  }, [date, enabled, plant]);

  useEffect(() => {
    if (!enabled) return;

    function onOpenRequest() {
      setOpen(true);
    }

    window.addEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener(OPEN_TODAY_ENTRY_EVENT, onOpenRequest);
    };
  }, [enabled]);

  if (!enabled || !plant) return null;

  return (
    <TodayHub
      plantId={plant.id}
      plantName={plant.name}
      plantCode={plant.code}
      date={date}
      shiftModules={shiftModules}
      canEnter={canEnter}
      overlayOnly
      externalOpen={open}
      onExternalOpenChange={setOpen}
    />
  );
}
