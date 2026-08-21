import { NextRequest, NextResponse } from "next/server";
import type { MachineProductionShift } from "@prisma/client";
import {
  requireMachineProductionAccess,
  requireSession,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { canAdminMachineProduction } from "@/lib/rbac";
import {
  addDaysYmd,
  buildSlotContext,
  parseDateOnlyUtc,
  resolveCurrentSlot,
  resolveSlotStatus,
  slotsForShift,
  todayIstYmd,
} from "@/lib/machine-production/slots";

/**
 * Admin summary for a date (+ optional shift): totals across active machines
 * and current/selected slots, including Pending/Overdue virtual rows.
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const denied = requireMachineProductionAccess(session.user.globalRole);
  if (denied) return denied;

  if (!canAdminMachineProduction(session.user.globalRole)) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const date = sp.get("date") ?? todayIstYmd();
  const shiftParam = sp.get("shift");
  const now = new Date();
  const current = resolveCurrentSlot(now);

  const shifts: MachineProductionShift[] =
    shiftParam === "DAY" || shiftParam === "NIGHT"
      ? [shiftParam]
      : ["DAY", "NIGHT"];

  const machines = await prisma.machine.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const machineIds = machines.map((m) => m.id);

  const entries = await prisma.machineProductionEntry.findMany({
    where: {
      entryDate: parseDateOnlyUtc(date),
      shift: { in: [...shifts] },
      machineId: { in: machineIds },
    },
    select: {
      machineId: true,
      shift: true,
      slotStartHour: true,
      actualProduction: true,
      efficiencyPct: true,
    },
  });

  const entryKey = (machineId: string, shift: string, hour: number) =>
    `${machineId}|${shift}|${hour}`;

  const submitted = new Map(
    entries.map((e) => [
      entryKey(e.machineId, e.shift, e.slotStartHour),
      e,
    ]),
  );

  let completed = 0;
  let pending = 0;
  let overdue = 0;
  let actualSum = 0;
  let effSum = 0;
  let effCount = 0;

  // Evaluate every machine × every slot for selected shifts on that date.
  for (const shift of shifts) {
    for (const hour of slotsForShift(shift)) {
      // Skip future slots relative to "now" when date is today and shift/slot not started
      const slot = buildSlotContext(shift, date, hour);
      const slotStart =
        shift === "NIGHT" && (hour === 1 || hour === 5)
          ? new Date(
              `${addDaysYmd(date, 1)}T${String(hour).padStart(2, "0")}:00:00+05:30`,
            )
          : shift === "NIGHT" && hour === 21
            ? new Date(`${date}T21:00:00+05:30`)
            : new Date(
                `${date}T${String(hour).padStart(2, "0")}:00:00+05:30`,
              );

      const isFuture = slotStart.getTime() > now.getTime();

      for (const machineId of machineIds) {
        const hit = submitted.get(entryKey(machineId, shift, hour));
        if (hit) {
          completed += 1;
          actualSum += Number(hit.actualProduction);
          effSum += Number(hit.efficiencyPct);
          effCount += 1;
          continue;
        }
        if (isFuture) {
          // Not yet due — don't count as pending for past-date views either if future
          if (date === current.entryDate || date === todayIstYmd()) {
            continue;
          }
        }
        const status = resolveSlotStatus({
          submitted: false,
          deadlineIso: slot.deadlineIso,
          now,
        });
        if (status === "OVERDUE") overdue += 1;
        else pending += 1;
      }
    }
  }

  const total = completed + pending + overdue;

  return NextResponse.json({
    ok: true,
    date,
    shifts,
    summary: {
      total,
      completed,
      pending,
      overdue,
      actualProduction: Math.round(actualSum * 10000) / 10000,
      averageEfficiency:
        effCount === 0 ? 0 : Math.round((effSum / effCount) * 100) / 100,
    },
  });
}
