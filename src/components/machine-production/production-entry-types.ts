export type MachineCard = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  entryId: string | null;
  entryCount?: number;
  actualProduction: number | null;
  totalActualProduction?: number | null;
  efficiencyPct: number | null;
  submittedAt: string | null;
};

export type SlotInfo = {
  shift: "DAY" | "NIGHT";
  entryDate: string;
  slotStartHour: number;
  slotLabel: string;
  deadlineIso: string;
  deadlineLabel: string;
};

export type CableOption = { id: string; name: string };

export const TYPE_PLACEHOLDER = "Select cable type";
export const SIZE_PLACEHOLDER = "Select cable size";
export const OTHERS = "Others";
