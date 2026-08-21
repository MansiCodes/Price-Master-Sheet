import { NextRequest, NextResponse } from "next/server";
import { MachineProductionShift } from "@prisma/client";
import {
  requireMachineProductionAccess,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  addDaysYmd,
  buildSlotContext,
  type ShiftFilter,
  resolveCurrentSlot,
  resolveSlotStatus,
  slotsForShift,
  type SlotStatus,
} from "@/lib/machine-production/slots";

function parseShiftFilter(raw: string | null): ShiftFilter {
  if (raw === "DAY" || raw === "NIGHT" || raw === "ALL") return raw;
  return "ALL";
}

function viewSlotForFilter(
  shiftFilter: ShiftFilter,
  current: ReturnType<typeof resolveCurrentSlot>,
) {
  if (shiftFilter === "ALL" || shiftFilter === current.shift) {
    return current;
  }

  const focusShift = shiftFilter as MachineProductionShift;
  let entryDate = current.entryDate;

  // Night after midnight: "Day" refers to the calendar morning (entryDate + 1).
  if (
    focusShift === "DAY" &&
    current.shift === "NIGHT" &&
    current.slotStartHour !== 21
  ) {
    entryDate = addDaysYmd(current.entryDate, 1);
  }

  // Daytime viewing Night: use today's date as night start date.
  if (focusShift === "NIGHT" && current.shift === "DAY") {
    entryDate = current.entryDate;
  }

  return buildSlotContext(
    focusShift,
    entryDate,
    slotsForShift(focusShift)[0]!,
  );
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const shiftFilter = parseShiftFilter(
    request.nextUrl.searchParams.get("shift"),
  );
  const now = new Date();
  const current = resolveCurrentSlot(now);
  const activeSlot = viewSlotForFilter(shiftFilter, current);

  const machines = await prisma.machine.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const entries = await prisma.machineProductionEntry.findMany({
    where: {
      entryDate: new Date(`${activeSlot.entryDate}T00:00:00.000Z`),
      shift: activeSlot.shift,
      slotStartHour: activeSlot.slotStartHour,
      machineId: { in: machines.map((m) => m.id) },
    },
    select: {
      id: true,
      machineId: true,
      submittedAt: true,
      actualProduction: true,
      efficiencyPct: true,
    },
  });

  const byMachine = new Map(entries.map((e) => [e.machineId, e]));

  const cards = machines.map((m) => {
    const entry = byMachine.get(m.id);
    const status: SlotStatus = resolveSlotStatus({
      submitted: Boolean(entry),
      deadlineIso: activeSlot.deadlineIso,
      now,
    });
    return {
      id: m.id,
      name: m.name,
      code: m.code,
      description: m.description,
      status,
      entryId: entry?.id ?? null,
      actualProduction: entry ? Number(entry.actualProduction) : null,
      efficiencyPct: entry ? Number(entry.efficiencyPct) : null,
      submittedAt: entry?.submittedAt.toISOString() ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    shiftFilter,
    currentSlot: {
      shift: current.shift,
      entryDate: current.entryDate,
      slotStartHour: current.slotStartHour,
      slotLabel: current.slotLabel,
      deadlineIso: current.deadlineIso,
      deadlineLabel: current.deadlineLabel,
    },
    viewSlot: {
      shift: activeSlot.shift,
      entryDate: activeSlot.entryDate,
      slotStartHour: activeSlot.slotStartHour,
      slotLabel: activeSlot.slotLabel,
      deadlineIso: activeSlot.deadlineIso,
      deadlineLabel: activeSlot.deadlineLabel,
    },
    counts: {
      total: cards.length,
      completed: cards.filter((c) => c.status === "COMPLETED").length,
      pending: cards.filter((c) => c.status === "PENDING").length,
      overdue: cards.filter((c) => c.status === "OVERDUE").length,
    },
    machines: cards,
  });
}
