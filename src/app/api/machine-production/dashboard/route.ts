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

function slotContext(activeSlot: ReturnType<typeof resolveCurrentSlot>) {
  return {
    shift: activeSlot.shift,
    entryDate: activeSlot.entryDate,
    slotStartHour: activeSlot.slotStartHour,
    slotLabel: activeSlot.slotLabel,
    deadlineIso: activeSlot.deadlineIso,
    deadlineLabel: activeSlot.deadlineLabel,
  };
}

/**
 * Two-level board. Without `processId` it returns one card per process with
 * that process's progress for the active slot; with `processId` it returns the
 * machine cards belonging to that process.
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  const shiftFilter = parseShiftFilter(
    request.nextUrl.searchParams.get("shift"),
  );
  const processId = request.nextUrl.searchParams.get("processId")?.trim() || null;
  const now = new Date();
  const current = resolveCurrentSlot(now);
  const activeSlot = viewSlotForFilter(shiftFilter, current);

  const slotWhere = {
    entryDate: new Date(`${activeSlot.entryDate}T00:00:00.000Z`),
    shift: activeSlot.shift,
    slotStartHour: activeSlot.slotStartHour,
  };

  const processes = await prisma.productionProcess.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      machines: {
        orderBy: [{ sortOrder: "asc" }],
        include: {
          machine: {
            select: {
              id: true,
              name: true,
              code: true,
              description: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const machineIds = [
    ...new Set(
      processes.flatMap((p) =>
        p.machines.filter((l) => l.machine.isActive).map((l) => l.machineId),
      ),
    ),
  ];

  const entries = await prisma.machineProductionEntry.findMany({
    where: { ...slotWhere, machineId: { in: machineIds } },
    select: {
      id: true,
      machineId: true,
      submittedAt: true,
      actualProduction: true,
      efficiencyPct: true,
      currentProcess: true,
    },
  });
  const byMachine = new Map(entries.map((e) => [e.machineId, e]));

  const statusFor = (machineId: string): SlotStatus =>
    resolveSlotStatus({
      submitted: byMachine.has(machineId),
      deadlineIso: activeSlot.deadlineIso,
      now,
    });

  // ---- Level 2: machines inside one process ----
  if (processId) {
    const process = processes.find((p) => p.id === processId);
    if (!process) {
      return NextResponse.json(
        { error: "Process not found or inactive" },
        { status: 404 },
      );
    }

    const cards = process.machines
      .filter((link) => link.machine.isActive)
      .map((link) => {
        const m = link.machine;
        const entry = byMachine.get(m.id);
        return {
          id: m.id,
          name: m.name,
          code: m.code,
          description: m.description,
          status: statusFor(m.id),
          entryId: entry?.id ?? null,
          actualProduction: entry ? Number(entry.actualProduction) : null,
          efficiencyPct: entry ? Number(entry.efficiencyPct) : null,
          submittedAt: entry?.submittedAt.toISOString() ?? null,
        };
      });

    return NextResponse.json({
      ok: true,
      level: "machines" as const,
      shiftFilter,
      currentSlot: slotContext(current),
      viewSlot: slotContext(activeSlot),
      process: { id: process.id, name: process.name },
      counts: {
        total: cards.length,
        completed: cards.filter((c) => c.status === "COMPLETED").length,
        pending: cards.filter((c) => c.status === "PENDING").length,
        overdue: cards.filter((c) => c.status === "OVERDUE").length,
      },
      machines: cards,
    });
  }

  // ---- Level 1: process cards with per-slot progress ----
  const processCards = processes.map((p) => {
    const active = p.machines.filter((l) => l.machine.isActive);
    const statuses = active.map((l) => statusFor(l.machineId));
    const completed = statuses.filter((s) => s === "COMPLETED").length;
    const overdue = statuses.filter((s) => s === "OVERDUE").length;
    const pending = statuses.filter((s) => s === "PENDING").length;

    // Roll the machine statuses up: all in = done, any past deadline = overdue.
    const status: SlotStatus =
      active.length > 0 && completed === active.length
        ? "COMPLETED"
        : overdue > 0
          ? "OVERDUE"
          : "PENDING";

    return {
      id: p.id,
      name: p.name,
      machineCount: active.length,
      completed,
      pending,
      overdue,
      status,
    };
  });

  const allStatuses = processes.flatMap((p) =>
    p.machines.filter((l) => l.machine.isActive).map((l) => statusFor(l.machineId)),
  );

  return NextResponse.json({
    ok: true,
    level: "processes" as const,
    shiftFilter,
    currentSlot: slotContext(current),
    viewSlot: slotContext(activeSlot),
    counts: {
      total: allStatuses.length,
      completed: allStatuses.filter((s) => s === "COMPLETED").length,
      pending: allStatuses.filter((s) => s === "PENDING").length,
      overdue: allStatuses.filter((s) => s === "OVERDUE").length,
    },
    processes: processCards,
  });
}
