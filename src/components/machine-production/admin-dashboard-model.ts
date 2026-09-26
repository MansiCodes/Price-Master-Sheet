import type { EditField } from "@/components/pnl/EntryEditDrawer";

export type AdminTab = "records" | "machines" | "processes" | "cable";

export type MachineRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

export type EntryRow = {
  id: string;
  entryDate: string;
  shift: "DAY" | "NIGHT";
  shiftLabel: string;
  slotStartHour: number;
  slotLabel: string;
  currentProcess: string;
  cableType: string;
  cableSize: string;
  plannedProduction: number;
  actualProduction: number;
  efficiencyPct: number;
  operators: number;
  helpers: number;
  totalManpower: number;
  operatorName: string | null;
  remarks: string | null;
  photoUrls: string[];
  submittedAt: string;
  status: string;
  machine?: { id: string; name: string; code: string };
  supervisor?: { id: string; name: string | null; email: string };
};

export type ProcessRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  machineCount: number;
  machineIds: string[];
};

export type CableTypeRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type CableSizeRow = {
  id: string;
  cableTypeId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type Summary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  plannedProduction?: number;
  actualProduction: number;
  averageEfficiency: number;
};

export type DayWiseRow = {
  date: string;
  entries: number;
  plannedProduction: number;
  actualProduction: number;
  averageEfficiency: number;
};

export type MachineDayRow = {
  date: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  entries: number;
  plannedProduction: number;
  actualProduction: number;
  efficiencyPct: number;
  slots: EntryRow[];
};

export type Filters = {
  dateFrom: string;
  dateTo: string;
  shift: string;
  slotStartHour: string;
  machineId: string;
};

export function defaultRecordFilters(): Filters {
  return {
    dateFrom: "",
    dateTo: "",
    shift: "",
    slotStartHour: "",
    machineId: "",
  };
}

export const ENTRY_EDIT_FIELDS: EditField[] = [
  { name: "currentProcess", label: "Process", required: true },
  { name: "cableType", label: "Cable type", required: true },
  { name: "cableSize", label: "Cable size", required: true },
  { name: "operatorName", label: "Operator name", required: true },
  { name: "plannedProduction", label: "Planned production", type: "number", required: true },
  { name: "actualProduction", label: "Actual production", type: "number", required: true },
  { name: "operators", label: "Operators", type: "number", required: true },
  { name: "helpers", label: "Helpers", type: "number", required: true },
  { name: "remarks", label: "Remarks", type: "textarea" },
];

export type PendingDelete =
  | { kind: "entry"; id: string }
  | { kind: "machine"; id: string }
  | { kind: "process"; id: string }
  | { kind: "cableType"; id: string }
  | { kind: "cableSize"; id: string };
