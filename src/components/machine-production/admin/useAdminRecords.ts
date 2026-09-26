"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { patchJson } from "@/lib/client-forms";
import { addDaysYmd, todayIstYmd } from "@/lib/machine-production/slots";
import { downloadRecordsPdf as downloadRecordsPdfFile } from "@/components/machine-production/admin/downloadRecordsPdf";
import {
  defaultRecordFilters,
  type DayWiseRow,
  type EntryRow,
  type Filters,
  type MachineDayRow,
  type Summary,
} from "@/components/machine-production/admin-dashboard-model";

export function useAdminRecords() {
  const [filters, setFilters] = useState<Filters>(defaultRecordFilters);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [machineDayWise, setMachineDayWise] = useState<MachineDayRow[]>([]);
  const [expandedMachineDays, setExpandedMachineDays] = useState<
    Record<string, boolean>
  >({});
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesPageSize, setEntriesPageSize] = useState(50);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [dayWise, setDayWise] = useState<DayWiseRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [boardSummary, setBoardSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EntryRow | null>(null);
  const [editingEntry, setEditingEntry] = useState<EntryRow | null>(null);
  const [entryEditValues, setEntryEditValues] = useState<
    Record<string, string>
  >({});
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryEditError, setEntryEditError] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (opts?: { page?: number; pageSize?: number; filters?: Filters }) => {
      setLoading(true);
      const activeFilters = opts?.filters ?? filters;
      const page = opts?.page ?? entriesPage;
      const pageSize = opts?.pageSize ?? entriesPageSize;
      const sp = new URLSearchParams();
      if (activeFilters.dateFrom) sp.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) sp.set("dateTo", activeFilters.dateTo);
      if (activeFilters.shift) sp.set("shift", activeFilters.shift);
      if (activeFilters.slotStartHour) {
        sp.set("slotStartHour", activeFilters.slotStartHour);
      }
      if (activeFilters.machineId) sp.set("machineId", activeFilters.machineId);
      sp.set("page", String(page));
      sp.set("pageSize", String(pageSize));

      try {
        const [entriesRes, summaryRes] = await Promise.all([
          fetch(`/api/machine-production/entries?${sp}`),
          fetch(
            `/api/machine-production/summary?date=${activeFilters.dateFrom || todayIstYmd()}${
              activeFilters.shift ? `&shift=${activeFilters.shift}` : ""
            }`,
          ),
        ]);
        const entriesJson = (await entriesRes.json()) as {
          entries?: EntryRow[];
          dayWise?: DayWiseRow[];
          machineDayWise?: MachineDayRow[];
          summary?: Summary;
          page?: number;
          pageSize?: number;
          total?: number;
          error?: string;
        };
        const summaryJson = (await summaryRes.json()) as {
          summary?: Summary;
          error?: string;
        };
        if (!entriesRes.ok) {
          toast.error(entriesJson.error ?? "Failed to load records");
        } else {
          const groups = entriesJson.machineDayWise ?? [];
          setMachineDayWise(groups);
          setEntries(
            entriesJson.entries ??
              groups.flatMap((g) => g.slots ?? []),
          );
          setDayWise(entriesJson.dayWise ?? []);
          setSummary(entriesJson.summary ?? null);
          setEntriesTotal(entriesJson.total ?? 0);
          setExpandedMachineDays({});
          if (entriesJson.page) setEntriesPage(entriesJson.page);
          if (entriesJson.pageSize) setEntriesPageSize(entriesJson.pageSize);
        }
        if (summaryRes.ok) setBoardSummary(summaryJson.summary ?? null);
      } finally {
        setLoading(false);
      }
    },
    [filters, entriesPage, entriesPageSize],
  );

  function openEntryEdit(e: EntryRow) {
    setSelected(null);
    setEditingEntry(e);
    setEntryEditError(null);
    setEntryEditValues({
      currentProcess: e.currentProcess,
      cableType: e.cableType,
      cableSize: e.cableSize,
      operatorName: e.operatorName ?? "",
      plannedProduction: String(e.plannedProduction),
      actualProduction: String(e.actualProduction),
      operators: String(e.operators),
      helpers: String(e.helpers),
      remarks: e.remarks ?? "",
    });
  }

  function closeEntryEdit() {
    if (entrySaving) return;
    setEditingEntry(null);
    setEntryEditError(null);
  }

  async function saveEntryEdit() {
    if (!editingEntry) return;
    const planned = Number(entryEditValues.plannedProduction);
    const actual = Number(entryEditValues.actualProduction);
    const operators = Number(entryEditValues.operators);
    const helpers = Number(entryEditValues.helpers);
    const operatorName = entryEditValues.operatorName?.trim() ?? "";
    if (
      !Number.isFinite(planned) ||
      !Number.isFinite(actual) ||
      !Number.isInteger(operators) ||
      !Number.isInteger(helpers) ||
      planned < 0 ||
      actual < 0 ||
      operators < 0 ||
      helpers < 0
    ) {
      setEntryEditError("Enter valid production and manpower numbers");
      return;
    }
    if (!operatorName) {
      setEntryEditError("Operator name is required");
      return;
    }

    setEntrySaving(true);
    setEntryEditError(null);
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/entries/${editingEntry.id}`,
      {
        currentProcess: entryEditValues.currentProcess?.trim(),
        cableType: entryEditValues.cableType?.trim(),
        cableSize: entryEditValues.cableSize?.trim(),
        operatorName,
        plannedProduction: planned,
        actualProduction: actual,
        operators,
        helpers,
        remarks: entryEditValues.remarks?.trim() || null,
      },
    );
    setEntrySaving(false);
    if (!res.ok) {
      setEntryEditError(res.error);
      return;
    }
    toast.success("Entry updated");
    setEditingEntry(null);
    void loadEntries();
  }

  const recordsByDate = useMemo(() => {
    const map = new Map<string, MachineDayRow[]>();
    for (const row of machineDayWise) {
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));
  }, [machineDayWise]);

  const todayYmd = todayIstYmd();
  const isDefaultDateRange =
    filters.dateFrom === addDaysYmd(todayYmd, -7) &&
    filters.dateTo === todayYmd;
  const filtersDirty =
    !isDefaultDateRange ||
    Boolean(filters.shift || filters.slotStartHour || filters.machineId);

  function patchFilters(
    next: Filters | ((prev: Filters) => Filters),
  ) {
    setFilters(next);
    setEntriesPage(1);
  }

  async function downloadRecordsPdf() {
    await downloadRecordsPdfFile({ filters, entriesTotal, dayWise });
  }

  return {
    filters,
    entries,
    expandedMachineDays,
    setExpandedMachineDays,
    entriesPage,
    setEntriesPage,
    entriesPageSize,
    setEntriesPageSize,
    entriesTotal,
    dayWise,
    summary,
    boardSummary,
    loading,
    selected,
    setSelected,
    editingEntry,
    entryEditValues,
    setEntryEditValues,
    entrySaving,
    entryEditError,
    loadEntries,
    openEntryEdit,
    closeEntryEdit,
    saveEntryEdit,
    recordsByDate,
    todayYmd,
    filtersDirty,
    patchFilters,
    downloadRecordsPdf,
  };
}
