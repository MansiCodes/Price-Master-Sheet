import { prisma } from "@/lib/db";
import {
  addDaysYmd,
  buildSlotContext,
  parseDateOnlyUtc,
  resolveCurrentSlot,
  resolveSlotStatus,
  slotsForShift,
  todayIstYmd,
  type SlotContext,
} from "@/lib/machine-production/slots";

export type MpProcessProgress = {
  id: string;
  name: string;
  done: number;
  total: number;
  filled: boolean;
};

export type MpShiftProgress = {
  completed: number;
  total: number;
  allComplete: boolean;
};

export type MpDayRow = {
  date: string;
  dayShift: MpShiftProgress;
  nightShift: MpShiftProgress;
  allComplete: boolean;
};

export type MpHomeMetrics = {
  currentSlot: SlotContext;
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  avgEfficiencyPct: number | null;
  actualProductionSum: number;
  processesByShift: {
    DAY: MpProcessProgress[];
    NIGHT: MpProcessProgress[];
  };
  dailyReportRows: MpDayRow[];
};

/**
 * Home metrics for Machine Supervisor Dashboard — KPIs for the live slot,
 * process checklist by Day/Night, and a 7-day submission scoreboard.
 */
export async function getMachineProductionHomeMetrics(
  now = new Date(),
): Promise<MpHomeMetrics> {
  const current = resolveCurrentSlot(now);
  const today = todayIstYmd(now);

  const processes = await prisma.productionProcess.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      machines: {
        include: {
          machine: { select: { id: true, isActive: true } },
        },
      },
    },
  });

  const processMachines = processes.map((p) => ({
    id: p.id,
    name: p.name,
    machineIds: p.machines
      .filter((l) => l.machine.isActive)
      .map((l) => l.machineId),
  }));

  const allMachineIds = [
    ...new Set(processMachines.flatMap((p) => p.machineIds)),
  ];

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(addDaysYmd(today, -i));
  }
  const minDate = weekDates[weekDates.length - 1]!;

  const entries = await prisma.machineProductionEntry.findMany({
    where: {
      machineId: { in: allMachineIds },
      entryDate: {
        gte: parseDateOnlyUtc(minDate),
        lte: parseDateOnlyUtc(today),
      },
    },
    select: {
      machineId: true,
      entryDate: true,
      shift: true,
      slotStartHour: true,
      actualProduction: true,
      efficiencyPct: true,
    },
  });

  const submitted = new Set(
    entries.map((e) => {
      const ymd = e.entryDate.toISOString().slice(0, 10);
      return `${e.machineId}|${ymd}|${e.shift}|${e.slotStartHour}`;
    }),
  );

  const currentEntries = entries.filter((e) => {
    const ymd = e.entryDate.toISOString().slice(0, 10);
    return (
      ymd === current.entryDate &&
      e.shift === current.shift &&
      e.slotStartHour === current.slotStartHour
    );
  });
  const currentByMachine = new Map(
    currentEntries.map((e) => [e.machineId, e]),
  );

  const allStatuses = allMachineIds.map((machineId) =>
    resolveSlotStatus({
      submitted: currentByMachine.has(machineId),
      deadlineIso: current.deadlineIso,
      now,
    }),
  );

  let effSum = 0;
  let effCount = 0;
  let actualSum = 0;
  for (const e of currentEntries) {
    actualSum += Number(e.actualProduction);
    const eff = Number(e.efficiencyPct);
    if (Number.isFinite(eff)) {
      effSum += eff;
      effCount += 1;
    }
  }

  const daySlot =
    current.shift === "DAY"
      ? current
      : buildSlotContext("DAY", today, slotsForShift("DAY")[0]!);
  const nightSlot =
    current.shift === "NIGHT"
      ? current
      : buildSlotContext("NIGHT", today, slotsForShift("NIGHT")[0]!);

  function processesFor(slot: SlotContext): MpProcessProgress[] {
    return processMachines.map((p) => {
      let done = 0;
      for (const mid of p.machineIds) {
        if (
          submitted.has(
            `${mid}|${slot.entryDate}|${slot.shift}|${slot.slotStartHour}`,
          )
        ) {
          done += 1;
        }
      }
      const total = p.machineIds.length;
      return {
        id: p.id,
        name: p.name,
        done,
        total,
        filled: total > 0 && done === total,
      };
    });
  }

  function shiftProgressForDate(
    date: string,
    shift: "DAY" | "NIGHT",
  ): MpShiftProgress {
    const hours = slotsForShift(shift);
    let completed = 0;
    const total = allMachineIds.length * hours.length;
    for (const hour of hours) {
      for (const mid of allMachineIds) {
        if (submitted.has(`${mid}|${date}|${shift}|${hour}`)) {
          completed += 1;
        }
      }
    }
    return {
      completed,
      total,
      allComplete: total > 0 && completed === total,
    };
  }

  const dailyReportRows: MpDayRow[] = weekDates.map((date) => {
    const dayShift = shiftProgressForDate(date, "DAY");
    const nightShift = shiftProgressForDate(date, "NIGHT");
    return {
      date,
      dayShift,
      nightShift,
      allComplete: dayShift.allComplete && nightShift.allComplete,
    };
  });

  return {
    currentSlot: current,
    counts: {
      total: allStatuses.length,
      completed: allStatuses.filter((s) => s === "COMPLETED").length,
      pending: allStatuses.filter((s) => s === "PENDING").length,
      overdue: allStatuses.filter((s) => s === "OVERDUE").length,
    },
    avgEfficiencyPct:
      effCount > 0 ? Math.round((effSum / effCount) * 10) / 10 : null,
    actualProductionSum: actualSum,
    processesByShift: {
      DAY: processesFor(daySlot),
      NIGHT: processesFor(nightSlot),
    },
    dailyReportRows,
  };
}
