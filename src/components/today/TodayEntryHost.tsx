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
  userRole = "",
  canAccessStock = false,
  plants = [],
}: {
  plant: PlantInfo | null;
  canEnter: boolean;
  userRole?: string;
  canAccessStock?: boolean;
  plants?: PlantInfo[];
}) {
  const pathname = usePathname();
  const date = useMemo(() => todayLocalISO(), []);
  const [shiftModules, setShiftModules] = useState<ShiftModulesMap>(
    emptyShiftModules,
  );
  const [open, setOpen] = useState(false);

  // If user is currently on /plants/[plantId]/..., bind the quick-entry slide-over
  // to that active plant rather than the fallback/cookie plant.
  const activePlant = useMemo(() => {
    const match = pathname?.match(/^\/plants\/([^/]+)/);
    if (match && match[1] && plants.length > 0) {
      const found = plants.find((p) => p.id === match[1] || p.code?.toUpperCase() === match[1]?.toUpperCase());
      if (found) return found;
    }
    return plant;
  }, [pathname, plants, plant]);

  // Dashboard "/" normally uses embedded TodayHub. Machine Supervisor + Stock
  // only has MachineProductionHome on "/", so the global host must work there too.
  const allowOnHome =
    userRole === "MACHINE_SUPERVISOR" && canAccessStock;
  const enabled = Boolean(
    activePlant && canEnter && (pathname !== "/" || allowOnHome),
  );

  useEffect(() => {
    if (!enabled || !activePlant) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/plants/${activePlant.id}/today?date=${encodeURIComponent(date)}`,
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
  }, [date, enabled, activePlant]);

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

  if (!enabled || !activePlant) return null;

  return (
    <TodayHub
      plantId={activePlant.id}
      plantName={activePlant.name}
      plantCode={activePlant.code}
      date={date}
      shiftModules={shiftModules}
      canEnter={canEnter}
      overlayOnly
      externalOpen={open}
      onExternalOpenChange={setOpen}
      userRole={userRole}
      canAccessStock={canAccessStock}
    />
  );
}
