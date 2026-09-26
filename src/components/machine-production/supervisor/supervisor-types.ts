import type { MachineCard, SlotInfo } from "@/components/machine-production/ProductionEntryForm";
import type { ShiftFilter, SlotStatus } from "@/lib/machine-production/slots";

export type Counts = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
};

export type ProcessCard = {
  id: string;
  name: string;
  machineCount: number;
  completed: number;
  pending: number;
  overdue: number;
  status: SlotStatus;
};

export type ProcessLevel = {
  ok: boolean;
  level: "processes";
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  counts: Counts;
  processes: ProcessCard[];
  error?: string;
};

export type MachineLevel = {
  ok: boolean;
  level: "machines";
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  process: { id: string; name: string };
  counts: Counts;
  machines: MachineCard[];
  error?: string;
};

export type DashboardPayload = ProcessLevel | MachineLevel;
