import { MachineProductionShift, Prisma } from "@prisma/client";
import {
  buildSlotContext,
  resolveSlotStatus,
  shiftDisplayLabel,
  slotWindowLabel,
} from "@/lib/machine-production/slots";

export function serializeEntry(
  entry: {
    id: string;
    machineId: string;
    supervisorId: string;
    entryDate: Date;
    shift: MachineProductionShift;
    slotStartHour: number;
    currentProcess: string;
    cableType: string;
    cableSize: string;
    plannedProduction: Prisma.Decimal;
    actualProduction: Prisma.Decimal;
    efficiencyPct: Prisma.Decimal;
    operators: number;
    helpers: number;
    totalManpower: number;
    operatorName: string | null;
    remarks: string | null;
    coilNo: string | null;
    weight: Prisma.Decimal | null;
    photoUrls: string[];
    submittedAt: Date;
    createdAt: Date;
    machine?: { id: string; name: string; code: string };
    supervisor?: { id: string; name: string | null; email: string };
  },
  now = new Date(),
) {
  const entryDate = entry.entryDate.toISOString().slice(0, 10);
  const slot = buildSlotContext(entry.shift, entryDate, entry.slotStartHour);
  const status = resolveSlotStatus({
    submitted: true,
    deadlineIso: slot.deadlineIso,
    now,
  });

  return {
    id: entry.id,
    machineId: entry.machineId,
    machine: entry.machine
      ? {
          id: entry.machine.id,
          name: entry.machine.name,
          code: entry.machine.code,
        }
      : undefined,
    supervisorId: entry.supervisorId,
    supervisor: entry.supervisor
      ? {
          id: entry.supervisor.id,
          name: entry.supervisor.name,
          email: entry.supervisor.email,
        }
      : undefined,
    entryDate,
    shift: entry.shift,
    shiftLabel: shiftDisplayLabel(entry.shift),
    slotStartHour: entry.slotStartHour,
    slotLabel: slotWindowLabel(entry.slotStartHour),
    currentProcess: entry.currentProcess,
    cableType: entry.cableType,
    cableSize: entry.cableSize,
    plannedProduction: Number(entry.plannedProduction),
    actualProduction: Number(entry.actualProduction),
    efficiencyPct: Number(entry.efficiencyPct),
    operators: entry.operators,
    helpers: entry.helpers,
    totalManpower: entry.totalManpower,
    operatorName: entry.operatorName,
    remarks: entry.remarks,
    coilNo: entry.coilNo,
    weight: entry.weight ? Number(entry.weight) : null,
    photoUrls: entry.photoUrls,
    submittedAt: entry.submittedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    status,
    deadlineIso: slot.deadlineIso,
    deadlineLabel: slot.deadlineLabel,
  };
}
