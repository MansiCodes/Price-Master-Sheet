import { toast } from "sonner";
import type {
  DayWiseRow,
  EntryRow,
  Filters,
  MachineDayRow,
  Summary,
} from "@/components/machine-production/admin-dashboard-model";

export async function downloadRecordsPdf(args: {
  filters: Filters;
  entriesTotal: number;
  dayWise: DayWiseRow[];
}) {
  const { filters, entriesTotal, dayWise } = args;
  if (entriesTotal === 0) {
    toast.error("No records to export");
    return;
  }
  try {
    const sp = new URLSearchParams();
    if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) sp.set("dateTo", filters.dateTo);
    if (filters.shift) sp.set("shift", filters.shift);
    if (filters.slotStartHour) {
      sp.set("slotStartHour", filters.slotStartHour);
    }
    if (filters.machineId) sp.set("machineId", filters.machineId);
    sp.set("page", "1");
    sp.set("pageSize", String(entriesTotal));

    const res = await fetch(`/api/machine-production/entries?${sp}`);
    const json = (await res.json()) as {
      entries?: EntryRow[];
      dayWise?: DayWiseRow[];
      machineDayWise?: MachineDayRow[];
      summary?: Summary;
      error?: string;
    };
    if (!res.ok) {
      toast.error(json.error ?? "Failed to load records for export");
      return;
    }
    const allGroups = json.machineDayWise ?? [];
    const allEntries =
      json.entries ?? allGroups.flatMap((g) => g.slots ?? []);
    if (allGroups.length === 0 && allEntries.length === 0) {
      toast.error("No records to export");
      return;
    }

    const { buildMachineProductionRecordsPdf } = await import(
      "@/lib/machine-production/records-pdf"
    );
    const { blob, filename } = buildMachineProductionRecordsPdf({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      plannedTotal: json.summary?.plannedProduction ?? 0,
      actualTotal: json.summary?.actualProduction ?? 0,
      dayWise: json.dayWise ?? dayWise,
      machineDayWise: allGroups.map((m) => ({
        date: m.date,
        machineName: m.machineName,
        machineCode: m.machineCode,
        entries: m.entries,
        plannedProduction: m.plannedProduction,
        actualProduction: m.actualProduction,
        efficiencyPct: m.efficiencyPct,
        slots: (m.slots ?? []).map((e) => ({
          entryDate: e.entryDate,
          machineName: e.machine?.name ?? m.machineName,
          machineCode: e.machine?.code ?? m.machineCode,
          shiftLabel: e.shiftLabel,
          slotLabel: e.slotLabel,
          operatorName: e.operatorName?.trim() || "—",
          currentProcess: e.currentProcess || "—",
          cableType: e.cableType,
          cableSize: e.cableSize,
          plannedProduction: e.plannedProduction,
          actualProduction: e.actualProduction,
          efficiencyPct: e.efficiencyPct,
          status: e.status,
          operators: e.operators,
          helpers: e.helpers,
          totalManpower: e.totalManpower,
        })),
      })),
      entries: allEntries.map((e) => ({
        entryDate: e.entryDate,
        machineName: e.machine?.name ?? "—",
        machineCode: e.machine?.code ?? "",
        shiftLabel: e.shiftLabel,
        slotLabel: e.slotLabel,
        operatorName: e.operatorName?.trim() || "—",
        currentProcess: e.currentProcess || "—",
        cableType: e.cableType,
        cableSize: e.cableSize,
        plannedProduction: e.plannedProduction,
        actualProduction: e.actualProduction,
        efficiencyPct: e.efficiencyPct,
        status: e.status,
        operators: e.operators,
        helpers: e.helpers,
        totalManpower: e.totalManpower,
      })),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded");
  } catch (err) {
    console.error(err);
    toast.error("Could not generate PDF");
  }
}
