"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { DeleteConfirmDialog } from "@/components/pnl/DeleteConfirmDialog";
import {
  EntryEditDrawer,
  type EditField,
} from "@/components/pnl/EntryEditDrawer";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { TablePageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import { Pagination } from "@/components/ui/Pagination";
import { DEFAULT_REPORT_PAGE_SIZE } from "@/components/pnl/usePaginatedReport";
import { MachineMultiSelect } from "@/components/machine-production/MachineMultiSelect";
import { deleteJson, patchJson, postJson } from "@/lib/client-forms";
import { todayIstYmd, DAY_SLOT_HOURS, NIGHT_SLOT_HOURS, slotWindowLabel } from "@/lib/machine-production/slots";
import "@/components/pnl/pnl-reports.css";

type MachineRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

type EntryRow = {
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

type ProcessRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  machineCount: number;
  machineIds: string[];
};

type CableTypeRow = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type CableSizeRow = {
  id: string;
  cableTypeId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type Summary = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  plannedProduction?: number;
  actualProduction: number;
  averageEfficiency: number;
};

type DayWiseRow = {
  date: string;
  entries: number;
  plannedProduction: number;
  actualProduction: number;
  averageEfficiency: number;
};

type MachineDayRow = {
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

type Filters = {
  dateFrom: string;
  dateTo: string;
  shift: string;
  slotStartHour: string;
  machineId: string;
};

const EMPTY_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  shift: "",
  slotStartHour: "",
  machineId: "",
};

const ENTRY_EDIT_FIELDS: EditField[] = [
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

type PendingDelete =
  | { kind: "entry"; id: string }
  | { kind: "machine"; id: string }
  | { kind: "process"; id: string }
  | { kind: "cableType"; id: string }
  | { kind: "cableSize"; id: string };

export function AdminDashboard() {
  const [tab, setTab] = useState<
    "records" | "machines" | "processes" | "cable"
  >("records");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [machineDayWise, setMachineDayWise] = useState<MachineDayRow[]>([]);
  const [expandedMachineDays, setExpandedMachineDays] = useState<
    Record<string, boolean>
  >({});
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesPageSize, setEntriesPageSize] = useState(DEFAULT_REPORT_PAGE_SIZE);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [dayWise, setDayWise] = useState<DayWiseRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [boardSummary, setBoardSummary] = useState<Summary | null>(null);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [cableTypes, setCableTypes] = useState<CableTypeRow[]>([]);
  const [cableSizes, setCableSizes] = useState<CableSizeRow[]>([]);
  const [cableProcessId, setCableProcessId] = useState("");
  const [cableMachineId, setCableMachineId] = useState("");
  const [selectedCableTypeId, setSelectedCableTypeId] = useState("");
  const [cableTypeForm, setCableTypeForm] = useState({ name: "" });
  const [cableSizeForm, setCableSizeForm] = useState({ name: "" });
  const [editingCableTypeId, setEditingCableTypeId] = useState<string | null>(
    null,
  );
  const [editingCableSizeId, setEditingCableSizeId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EntryRow | null>(null);
  const [editingEntry, setEditingEntry] = useState<EntryRow | null>(null);
  const [entryEditValues, setEntryEditValues] = useState<
    Record<string, string>
  >({});
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryEditError, setEntryEditError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [pendingToggleMachine, setPendingToggleMachine] = useState<{
    machine: MachineRow;
    nextActive: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingMachine, setTogglingMachine] = useState(false);

  const [machineForm, setMachineForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [machineSaving, setMachineSaving] = useState(false);
  const [machinesTable, setMachinesTable] = useState<MachineRow[]>([]);
  const [machinesPage, setMachinesPage] = useState(1);
  const [machinesPageSize, setMachinesPageSize] = useState(
    DEFAULT_REPORT_PAGE_SIZE,
  );
  const [machinesTotal, setMachinesTotal] = useState(0);
  const [machinesTableLoading, setMachinesTableLoading] = useState(false);
  const [processForm, setProcessForm] = useState({ name: "" });
  const [editingProcessId, setEditingProcessId] = useState<string | null>(
    null,
  );
  const [processSaving, setProcessSaving] = useState(false);
  const [processesTable, setProcessesTable] = useState<ProcessRow[]>([]);
  const [processesPage, setProcessesPage] = useState(1);
  const [processesPageSize, setProcessesPageSize] = useState(
    DEFAULT_REPORT_PAGE_SIZE,
  );
  const [processesTotal, setProcessesTotal] = useState(0);
  const [processesTableLoading, setProcessesTableLoading] = useState(false);
  const [pendingToggleProcess, setPendingToggleProcess] = useState<{
    process: ProcessRow;
    nextActive: boolean;
  } | null>(null);
  const [togglingProcess, setTogglingProcess] = useState(false);
  const [pendingToggleCableType, setPendingToggleCableType] = useState<{
    type: CableTypeRow;
    nextActive: boolean;
  } | null>(null);
  const [pendingToggleCableSize, setPendingToggleCableSize] = useState<{
    size: CableSizeRow;
    nextActive: boolean;
  } | null>(null);
  const [togglingCableType, setTogglingCableType] = useState(false);
  const [togglingCableSize, setTogglingCableSize] = useState(false);
  /** Machines ticked for the process being created or edited. */
  const [processMachineIds, setProcessMachineIds] = useState<string[]>([]);

  const loadAllMachines = useCallback(async () => {
    const res = await fetch("/api/machine-production/machines?all=1");
    const json = (await res.json()) as {
      machines?: MachineRow[];
      error?: string;
    };
    if (!res.ok) {
      toast.error(json.error ?? "Failed to load machines");
      return;
    }
    setMachines(json.machines ?? []);
  }, []);

  const loadMachinesTable = useCallback(async () => {
    setMachinesTableLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(machinesPage),
        pageSize: String(machinesPageSize),
      });
      const res = await fetch(`/api/machine-production/machines?${sp}`);
      const json = (await res.json()) as {
        machines?: MachineRow[];
        total?: number;
        page?: number;
        pageSize?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load machines");
        return;
      }
      setMachinesTable(json.machines ?? []);
      setMachinesTotal(json.total ?? 0);
      if (json.page) setMachinesPage(json.page);
      if (json.pageSize) setMachinesPageSize(json.pageSize);
    } finally {
      setMachinesTableLoading(false);
    }
  }, [machinesPage, machinesPageSize]);

  const refreshMachines = useCallback(async () => {
    await Promise.all([loadAllMachines(), loadMachinesTable()]);
  }, [loadAllMachines, loadMachinesTable]);

  const loadAllProcesses = useCallback(async () => {
    const res = await fetch("/api/machine-production/processes?all=1");
    const json = (await res.json()) as {
      processes?: ProcessRow[];
      error?: string;
    };
    if (!res.ok) {
      toast.error(json.error ?? "Failed to load processes");
      return;
    }
    setProcesses(json.processes ?? []);
  }, []);

  const loadProcessesTable = useCallback(async () => {
    setProcessesTableLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(processesPage),
        pageSize: String(processesPageSize),
      });
      const res = await fetch(`/api/machine-production/processes?${sp}`);
      const json = (await res.json()) as {
        processes?: ProcessRow[];
        total?: number;
        page?: number;
        pageSize?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load processes");
        return;
      }
      setProcessesTable(json.processes ?? []);
      setProcessesTotal(json.total ?? 0);
      if (json.page) setProcessesPage(json.page);
      if (json.pageSize) setProcessesPageSize(json.pageSize);
    } finally {
      setProcessesTableLoading(false);
    }
  }, [processesPage, processesPageSize]);

  const refreshProcesses = useCallback(async () => {
    await Promise.all([loadAllProcesses(), loadProcessesTable()]);
  }, [loadAllProcesses, loadProcessesTable]);

  const loadCableTypes = useCallback(async () => {
    if (!cableProcessId || !cableMachineId) {
      setCableTypes([]);
      setSelectedCableTypeId("");
      setCableSizes([]);
      return;
    }
    const qs = new URLSearchParams({
      processId: cableProcessId,
      machineId: cableMachineId,
      all: "1",
    });
    const res = await fetch(`/api/machine-production/cable-types?${qs}`);
    const json = (await res.json()) as {
      types?: CableTypeRow[];
      error?: string;
    };
    if (!res.ok) {
      toast.error(json.error ?? "Failed to load cable types");
      setCableTypes([]);
      return;
    }
    const types = json.types ?? [];
    setCableTypes(types);
    setSelectedCableTypeId((prev) => {
      if (prev && types.some((t) => t.id === prev)) return prev;
      return types[0]?.id ?? "";
    });
  }, [cableProcessId, cableMachineId]);

  const loadCableSizes = useCallback(async (cableTypeId: string) => {
    if (!cableTypeId) {
      setCableSizes([]);
      return;
    }
    const res = await fetch(
      `/api/machine-production/cable-sizes?cableTypeId=${encodeURIComponent(cableTypeId)}&all=1`,
    );
    const json = (await res.json()) as {
      sizes?: CableSizeRow[];
      error?: string;
    };
    if (!res.ok) {
      toast.error(json.error ?? "Failed to load cable sizes");
      return;
    }
    setCableSizes(json.sizes ?? []);
  }, []);

  const cableMachinesForProcess = useMemo(() => {
    const process = processes.find((p) => p.id === cableProcessId);
    if (!process) return [] as MachineRow[];
    return machines.filter((m) => process.machineIds.includes(m.id));
  }, [processes, machines, cableProcessId]);

  const loadEntries = useCallback(
    async (opts?: { page?: number; pageSize?: number; filters?: Filters }) => {
      setLoading(true);
      const activeFilters = opts?.filters ?? appliedFilters;
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
    [appliedFilters, entriesPage, entriesPageSize],
  );

  useEffect(() => {
    void loadAllMachines();
  }, [loadAllMachines]);

  useEffect(() => {
    if (tab === "machines") void loadMachinesTable();
  }, [tab, machinesPage, machinesPageSize, loadMachinesTable]);

  useEffect(() => {
    if (tab === "records") void loadEntries();
    if (tab === "cable") {
      void loadAllProcesses();
      void loadCableTypes();
    }
  }, [tab, appliedFilters, entriesPage, entriesPageSize, loadEntries, loadCableTypes, loadAllProcesses]);

  useEffect(() => {
    if (tab !== "cable") return;
    void loadCableSizes(selectedCableTypeId);
  }, [tab, selectedCableTypeId, loadCableSizes]);

  useEffect(() => {
    void loadAllProcesses();
  }, [loadAllProcesses]);

  useEffect(() => {
    if (tab === "processes") void loadProcessesTable();
  }, [tab, processesPage, processesPageSize, loadProcessesTable]);

  useEffect(() => {
    if (!cableProcessId) {
      setCableMachineId("");
      return;
    }
    const allowed = cableMachinesForProcess.map((m) => m.id);
    setCableMachineId((prev) =>
      prev && allowed.includes(prev) ? prev : (allowed[0] ?? ""),
    );
  }, [cableProcessId, cableMachinesForProcess]);

  function startEditMachine(m: MachineRow) {
    setEditingId(m.id);
    setMachineForm({ name: m.name });
  }

  function resetMachineForm() {
    setEditingId(null);
    setMachineForm({ name: "" });
  }

  async function saveMachine() {
    const name = machineForm.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setMachineSaving(true);
    try {
      if (editingId) {
        const res = await patchJson<{ ok: boolean; error?: string }>(
          `/api/machine-production/machines/${editingId}`,
          { name },
        );
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Machine updated");
      } else {
        const res = await postJson<{ ok: boolean; error?: string }>(
          "/api/machine-production/machines",
          { name },
        );
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Machine created");
        setMachinesPage(1);
      }
      resetMachineForm();
      await refreshMachines();
    } finally {
      setMachineSaving(false);
    }
  }

  async function toggleActive(m: MachineRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/machines/${m.id}`,
      { isActive: !m.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(m.isActive ? "Machine deactivated" : "Machine activated");
    await refreshMachines();
    return true;
  }

  async function confirmToggleMachine() {
    if (!pendingToggleMachine || togglingMachine) return;
    setTogglingMachine(true);
    try {
      const ok = await toggleActive(pendingToggleMachine.machine);
      if (ok) setPendingToggleMachine(null);
    } finally {
      setTogglingMachine(false);
    }
  }

  async function saveProcess() {
    const name = processForm.name.trim();
    if (!name) {
      toast.error("Process name is required");
      return;
    }
    if (processMachineIds.length === 0) {
      toast.error("Tick at least one machine for this process");
      return;
    }
    const payload = { name, machineIds: processMachineIds };
    setProcessSaving(true);
    try {
      if (editingProcessId) {
        const res = await patchJson<{ ok: boolean; error?: string }>(
          `/api/machine-production/processes/${editingProcessId}`,
          payload,
        );
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Process updated");
      } else {
        const res = await postJson<{ ok: boolean; error?: string }>(
          "/api/machine-production/processes",
          payload,
        );
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Process added");
        setProcessesPage(1);
      }
      resetProcessForm();
      await refreshProcesses();
    } finally {
      setProcessSaving(false);
    }
  }

  async function toggleProcessActive(p: ProcessRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/processes/${p.id}`,
      { isActive: !p.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(p.isActive ? "Process deactivated" : "Process activated");
    await refreshProcesses();
    return true;
  }

  async function confirmToggleProcess() {
    if (!pendingToggleProcess || togglingProcess) return;
    setTogglingProcess(true);
    try {
      const ok = await toggleProcessActive(pendingToggleProcess.process);
      if (ok) setPendingToggleProcess(null);
    } finally {
      setTogglingProcess(false);
    }
  }

  function editProcess(p: ProcessRow) {
    setEditingProcessId(p.id);
    setProcessForm({ name: p.name });
    setProcessMachineIds(p.machineIds);
  }

  function resetProcessForm() {
    setEditingProcessId(null);
    setProcessForm({ name: "" });
    setProcessMachineIds([]);
  }

  /**
   * Moves one process up or down and persists the whole order. Optimistic so
   * repeated clicks feel instant; a failed save reloads the server's truth.
   */
  async function moveProcess(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= processes.length) return;

    const next = [...processes];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    setProcesses(next);

    const res = await patchJson<{ ok: boolean; error?: string }>(
      "/api/machine-production/processes",
      { order: next.map((p) => p.id) },
    );
    if (!res.ok) {
      toast.error(res.error);
      await refreshProcesses();
      return;
    }
    await refreshProcesses();
  }

  async function saveCableType(e: FormEvent) {
    e.preventDefault();
    const name = cableTypeForm.name.trim();
    if (!cableProcessId || !cableMachineId) {
      toast.error("Select a process and machine first");
      return;
    }
    if (!name) {
      toast.error("Cable type name is required");
      return;
    }
    if (editingCableTypeId) {
      const res = await patchJson<{ ok: boolean; error?: string }>(
        `/api/machine-production/cable-types/${editingCableTypeId}`,
        { name },
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Cable type updated");
    } else {
      const res = await postJson<{ ok: boolean; error?: string }>(
        "/api/machine-production/cable-types",
        {
          processId: cableProcessId,
          machineId: cableMachineId,
          name,
        },
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Cable type added");
    }
    setEditingCableTypeId(null);
    setCableTypeForm({ name: "" });
    void loadCableTypes();
  }

  async function addOthersCableType() {
    if (!cableProcessId || !cableMachineId) {
      toast.error("Select a process and machine first");
      return;
    }
    if (cableTypes.some((t) => t.name === "Others")) {
      toast.message("Others is already linked");
      return;
    }
    const res = await postJson<{ ok: boolean; error?: string }>(
      "/api/machine-production/cable-types",
      {
        processId: cableProcessId,
        machineId: cableMachineId,
        name: "Others",
      },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Others added");
    void loadCableTypes();
  }

  async function toggleCableType(t: CableTypeRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-types/${t.id}`,
      { isActive: !t.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(t.isActive ? "Cable type deactivated" : "Cable type activated");
    void loadCableTypes();
    return true;
  }

  async function confirmToggleCableType() {
    if (!pendingToggleCableType || togglingCableType) return;
    setTogglingCableType(true);
    try {
      const ok = await toggleCableType(pendingToggleCableType.type);
      if (ok) setPendingToggleCableType(null);
    } finally {
      setTogglingCableType(false);
    }
  }

  async function saveCableSize(e: FormEvent) {
    e.preventDefault();
    const name = cableSizeForm.name.trim();
    if (!selectedCableTypeId) {
      toast.error("Select a cable type first");
      return;
    }
    if (!name) {
      toast.error("Cable size name is required");
      return;
    }
    if (editingCableSizeId) {
      const res = await patchJson<{ ok: boolean; error?: string }>(
        `/api/machine-production/cable-sizes/${editingCableSizeId}`,
        { name },
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Cable size updated");
    } else {
      const res = await postJson<{ ok: boolean; error?: string }>(
        "/api/machine-production/cable-sizes",
        { cableTypeId: selectedCableTypeId, name },
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Cable size added");
    }
    setEditingCableSizeId(null);
    setCableSizeForm({ name: "" });
    void loadCableSizes(selectedCableTypeId);
  }

  async function addOthersCableSize() {
    if (!selectedCableTypeId) {
      toast.error("Select a cable type first");
      return;
    }
    if (cableSizes.some((s) => s.name === "Others")) {
      toast.message("Others is already linked");
      return;
    }
    const res = await postJson<{ ok: boolean; error?: string }>(
      "/api/machine-production/cable-sizes",
      { cableTypeId: selectedCableTypeId, name: "Others" },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Others size added");
    void loadCableSizes(selectedCableTypeId);
  }

  async function toggleCableSize(s: CableSizeRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-sizes/${s.id}`,
      { isActive: !s.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(s.isActive ? "Cable size deactivated" : "Cable size activated");
    void loadCableSizes(selectedCableTypeId);
    return true;
  }

  async function confirmToggleCableSize() {
    if (!pendingToggleCableSize || togglingCableSize) return;
    setTogglingCableSize(true);
    try {
      const ok = await toggleCableSize(pendingToggleCableSize.size);
      if (ok) setPendingToggleCableSize(null);
    } finally {
      setTogglingCableSize(false);
    }
  }

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

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const { kind, id } = pendingDelete;
    const url =
      kind === "entry"
        ? `/api/machine-production/entries/${id}`
        : kind === "machine"
          ? `/api/machine-production/machines/${id}`
          : kind === "process"
            ? `/api/machine-production/processes/${id}`
            : kind === "cableType"
              ? `/api/machine-production/cable-types/${id}`
              : `/api/machine-production/cable-sizes/${id}`;
    const res = await deleteJson<{ ok: boolean; error?: string }>(url);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Deleted");
    setPendingDelete(null);
    if (kind === "entry") {
      setSelected((s) => (s?.id === id ? null : s));
      void loadEntries();
    } else if (kind === "machine") {
      if (editingId === id) resetMachineForm();
      await refreshMachines();
    } else if (kind === "process") {
      if (editingProcessId === id) resetProcessForm();
      await refreshProcesses();
    } else if (kind === "cableType") {
      if (editingCableTypeId === id) {
        setEditingCableTypeId(null);
        setCableTypeForm({ name: "" });
      }
      void loadCableTypes();
    } else {
      if (editingCableSizeId === id) {
        setEditingCableSizeId(null);
        setCableSizeForm({ name: "" });
      }
      void loadCableSizes(selectedCableTypeId);
    }
  }

  const displaySummary = tab === "records" ? summary ?? boardSummary : boardSummary ?? summary;

  const cableMachineHint = !cableProcessId
    ? "Please select the process first"
    : undefined;
  const cableTypeHint = !cableProcessId
    ? "Please select the process first"
    : !cableMachineId
      ? "Please select the machine first"
      : undefined;
  const cableSizeHint = !selectedCableTypeId
    ? "Please select a cable type first"
    : undefined;

  async function downloadRecordsPdf() {
    if (entriesTotal === 0) {
      toast.error("No records to export");
      return;
    }
    try {
      const sp = new URLSearchParams();
      if (appliedFilters.dateFrom) sp.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) sp.set("dateTo", appliedFilters.dateTo);
      if (appliedFilters.shift) sp.set("shift", appliedFilters.shift);
      if (appliedFilters.slotStartHour) {
        sp.set("slotStartHour", appliedFilters.slotStartHour);
      }
      if (appliedFilters.machineId) sp.set("machineId", appliedFilters.machineId);
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
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
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

  const shiftItems = useMemo(
    () => [
      { value: "", label: "All" },
      { value: "DAY", label: "Day" },
      { value: "NIGHT", label: "Night" },
    ],
    [],
  );

  const slotItems = useMemo(() => {
    const hours =
      filters.shift === "DAY"
        ? DAY_SLOT_HOURS
        : filters.shift === "NIGHT"
          ? NIGHT_SLOT_HOURS
          : [...DAY_SLOT_HOURS, ...NIGHT_SLOT_HOURS];
    return [
      { value: "", label: "All" },
      ...hours.map((h) => ({
        value: String(h),
        label: slotWindowLabel(h),
      })),
    ];
  }, [filters.shift]);

  const machineItems = useMemo(
    () => [
      { value: "", label: "All" },
      ...machines.map((m) => ({
        value: m.id,
        label: m.name,
        searchText: m.code,
      })),
    ],
    [machines],
  );

  return (
    <div className="mp-root">
      <div className="mp-admin-top">
        <div className="mp-shift-tabs mp-shift-tabs--admin">
          <button
            type="button"
            className={
              tab === "records"
                ? "mp-shift-tab mp-shift-tab--active"
                : "mp-shift-tab"
            }
            onClick={() => setTab("records")}
          >
            Production records
          </button>
          <button
            type="button"
            className={
              tab === "machines"
                ? "mp-shift-tab mp-shift-tab--active"
                : "mp-shift-tab"
            }
            onClick={() => setTab("machines")}
          >
            Machines
          </button>
          <button
            type="button"
            className={
              tab === "processes"
                ? "mp-shift-tab mp-shift-tab--active"
                : "mp-shift-tab"
            }
            onClick={() => setTab("processes")}
          >
            Processes
          </button>
          <button
            type="button"
            className={
              tab === "cable"
                ? "mp-shift-tab mp-shift-tab--active"
                : "mp-shift-tab"
            }
            onClick={() => setTab("cable")}
          >
            Cable type & size
          </button>
        </div>

        {tab === "records" && displaySummary ? (
          <div className="mp-counts mp-counts--admin" aria-label="Production summary">
            <span className="mp-count">
              <span className="mp-count__label">Total</span>
              <span className="mp-count__value">{displaySummary.total}</span>
            </span>
            <span className="mp-count mp-count--ok">
              <span className="mp-count__label">Completed</span>
              <span className="mp-count__value">{displaySummary.completed}</span>
            </span>
            <span className="mp-count mp-count--pending">
              <span className="mp-count__label">Pending</span>
              <span className="mp-count__value">{displaySummary.pending}</span>
            </span>
            <span className="mp-count mp-count--overdue">
              <span className="mp-count__label">Overdue</span>
              <span className="mp-count__value">{displaySummary.overdue}</span>
            </span>
            <span className="mp-count mp-count--metric">
              <span className="mp-count__label">Planned</span>
              <span className="mp-count__value">
                {displaySummary.plannedProduction ?? 0}
              </span>
            </span>
            <span className="mp-count mp-count--metric">
              <span className="mp-count__label">Actual</span>
              <span className="mp-count__value">
                {displaySummary.actualProduction}
              </span>
            </span>
            <span className="mp-count mp-count--metric">
              <span className="mp-count__label">Eff</span>
              <span className="mp-count__value">
                {displaySummary.averageEfficiency}%
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {tab === "records" ? (
        <>
          <div className="mp-filters">
            <label>
              From
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
              />
            </label>
            <label htmlFor="mp-filter-shift">
              Shift
              <SelectMenu
                id="mp-filter-shift"
                value={filters.shift}
                items={shiftItems}
                placeholder="All"
                onChange={(value) =>
                  setFilters((f) => {
                    const nextHours =
                      value === "DAY"
                        ? DAY_SLOT_HOURS
                        : value === "NIGHT"
                          ? NIGHT_SLOT_HOURS
                          : [...DAY_SLOT_HOURS, ...NIGHT_SLOT_HOURS];
                    const slotOk =
                      !f.slotStartHour ||
                      (nextHours as readonly number[]).includes(
                        Number(f.slotStartHour),
                      );
                    return {
                      ...f,
                      shift: value,
                      slotStartHour: slotOk ? f.slotStartHour : "",
                    };
                  })
                }
              />
            </label>
            <label htmlFor="mp-filter-slot">
              Slot
              <SelectMenu
                id="mp-filter-slot"
                value={filters.slotStartHour}
                items={slotItems}
                placeholder="All"
                onChange={(value) =>
                  setFilters((f) => ({ ...f, slotStartHour: value }))
                }
              />
            </label>
            <label htmlFor="mp-filter-machine">
              Machine
              <SelectMenu
                id="mp-filter-machine"
                value={filters.machineId}
                items={machineItems}
                placeholder="All"
                searchable
                searchPlaceholder="Search machines…"
                onChange={(value) =>
                  setFilters((f) => ({ ...f, machineId: value }))
                }
              />
            </label>
            <label className="mp-filters__apply">
              <span className="mp-filters__apply-spacer" aria-hidden="true">
                &nbsp;
              </span>
              <div className="mp-filters__apply-actions">
                <Button
                  type="button"
                  onClick={() => {
                    setAppliedFilters(filters);
                    setEntriesPage(1);
                  }}
                >
                  Apply
                </Button>
                {(filters.dateFrom ||
                filters.dateTo ||
                filters.shift ||
                filters.slotStartHour ||
                filters.machineId) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFilters(EMPTY_FILTERS);
                      setAppliedFilters(EMPTY_FILTERS);
                      setEntriesPage(1);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading || entriesTotal === 0}
                  onClick={() => void downloadRecordsPdf()}
                >
                  Download PDF
                </Button>
              </div>
            </label>
          </div>

          {loading ? (
            <TablePageLoadingSkeleton
              rows={8}
              label="Loading production records"
              showChrome={false}
            />
          ) : (
            <>
              {dayWise.length > 0 ? (
                <div className="mp-daywise">
                  <div className="mp-table-wrap">
                    <table className="mp-table mp-table--daywise">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Entries</th>
                          <th>Planned</th>
                          <th>Actual</th>
                          <th>Avg Eff %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayWise.map((d) => (
                          <tr key={d.date}>
                            <td>{d.date}</td>
                            <td>{d.entries}</td>
                            <td>{d.plannedProduction}</td>
                            <td>{d.actualProduction}</td>
                            <td>{d.averageEfficiency}</td>
                          </tr>
                        ))}
                        {summary ? (
                          <tr className="mp-table__row mp-table__row--total">
                            <td>All days</td>
                            <td>{summary.total}</td>
                            <td>{summary.plannedProduction ?? 0}</td>
                            <td>{summary.actualProduction}</td>
                            <td>{summary.averageEfficiency}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mp-table-wrap">
                <table className="mp-table mp-table--wide">
                  <thead>
                    <tr>
                      <th className="mp-table__expand-col" aria-label="Expand" />
                      <th>Date</th>
                      <th>Machine</th>
                      <th>Slots</th>
                      <th>Planned</th>
                      <th>Actual</th>
                      <th>Eff %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machineDayWise.map((row) => {
                      const key = `${row.date}|${row.machineId}`;
                      const open = Boolean(expandedMachineDays[key]);
                      return (
                        <Fragment key={key}>
                          <tr
                            className="mp-table__row mp-table__row--machine-day"
                            onClick={() =>
                              setExpandedMachineDays((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }))
                            }
                          >
                            <td className="mp-table__expand-col">
                              <span
                                className={`mp-expand-chevron${open ? " mp-expand-chevron--open" : ""}`}
                                aria-hidden
                              >
                                ▸
                              </span>
                            </td>
                            <td>{row.date}</td>
                            <td>
                              {row.machineName}
                              <div className="mp-muted">{row.machineCode}</div>
                            </td>
                            <td>{row.entries}</td>
                            <td>{row.plannedProduction}</td>
                            <td>{row.actualProduction}</td>
                            <td>{row.efficiencyPct}</td>
                          </tr>
                          {open
                            ? (row.slots ?? []).map((e) => (
                                <tr
                                  key={`${key}-${e.id}`}
                                  className="mp-table__row mp-table__row--slot"
                                  onClick={() => setSelected(e)}
                                >
                                  <td />
                                  <td colSpan={2}>
                                    <span className="mp-muted">
                                      {e.shiftLabel} · {e.slotLabel}
                                    </span>
                                    <div>
                                      {e.operatorName?.trim() || "—"}
                                      {" · "}
                                      {e.currentProcess || "—"}
                                    </div>
                                    <div className="mp-muted">
                                      {e.cableType} · {e.cableSize}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="mp-status mp-status--ok">
                                      {e.status}
                                    </span>
                                  </td>
                                  <td>{e.plannedProduction}</td>
                                  <td>{e.actualProduction}</td>
                                  <td
                                    className="mp-table__actions"
                                    onClick={(ev) => ev.stopPropagation()}
                                  >
                                    <div className="mp-slot-actions">
                                      <span>{e.efficiencyPct}</span>
                                      <ReportRowActions
                                        onEdit={() => openEntryEdit(e)}
                                        onDelete={() =>
                                          setPendingDelete({
                                            kind: "entry",
                                            id: e.id,
                                          })
                                        }
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))
                            : null}
                        </Fragment>
                      );
                    })}
                    {machineDayWise.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="mp-muted">
                          No records for these filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={entriesPage}
                pageSize={entriesPageSize}
                total={entriesTotal}
                onPageChange={setEntriesPage}
                onPageSizeChange={(nextSize) => {
                  setEntriesPageSize(nextSize);
                  setEntriesPage(1);
                }}
              />
            </>
          )}
        </>
      ) : tab === "machines" ? (
        <div className="mp-admin-machines mp-admin-machines--full">
          <form
            className="mp-inline-form mp-inline-form--machine"
            onSubmit={(e) => {
              e.preventDefault();
              void saveMachine();
            }}
          >
            <h2 className="mp-inline-form__title">
              {editingId ? "Edit machine" : "Add machine"}
            </h2>
            <label className="mp-inline-form__field">
              Name
              <input
                required
                value={machineForm.name}
                onChange={(e) =>
                  setMachineForm({ name: e.target.value })
                }
                placeholder="e.g. 100MM"
              />
            </label>
            <div className="mp-inline-form__actions">
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetMachineForm}
                  disabled={machineSaving}
                >
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={machineSaving}>
                {machineSaving
                  ? "Saving…"
                  : editingId
                    ? "Save"
                    : "Add machine"}
              </Button>
            </div>
          </form>

          {machinesTableLoading ? (
            <TablePageLoadingSkeleton
              rows={6}
              label="Loading machines"
              showChrome={false}
            />
          ) : (
            <>
              <div className="mp-table-wrap mp-table-wrap--full">
                <table className="mp-table mp-table--admin">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machinesTable.map((m) => (
                      <tr key={m.id}>
                        <td>{m.code}</td>
                        <td>
                          {m.name}
                          {m.description ? (
                            <div className="mp-muted">{m.description}</div>
                          ) : null}
                        </td>
                        <td>
                          <label
                            className="mp-toggle"
                            title={m.isActive ? "Active" : "Inactive"}
                          >
                            <input
                              type="checkbox"
                              className="mp-toggle__input"
                              checked={m.isActive}
                              onChange={() => {
                                setPendingToggleMachine({
                                  machine: m,
                                  nextActive: !m.isActive,
                                });
                              }}
                            />
                            <span className="mp-toggle__track" aria-hidden="true" />
                          </label>
                        </td>
                        <td className="mp-table__actions">
                          <ReportRowActions
                            onEdit={() => startEditMachine(m)}
                            onDelete={() =>
                              setPendingDelete({ kind: "machine", id: m.id })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                    {machinesTable.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="mp-muted">
                          No machines yet. Add one using the form above.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={machinesPage}
                pageSize={machinesPageSize}
                total={machinesTotal}
                onPageChange={setMachinesPage}
                onPageSizeChange={(nextSize) => {
                  setMachinesPageSize(nextSize);
                  setMachinesPage(1);
                }}
              />
            </>
          )}
        </div>
      ) : tab === "processes" ? (
        <div className="mp-admin-machines mp-admin-machines--full">
          <form
            className="mp-inline-form mp-inline-form--process"
            onSubmit={(e) => {
              e.preventDefault();
              void saveProcess();
            }}
          >
            <h2 className="mp-inline-form__title">
              {editingProcessId ? "Edit process" : "Add process"}
            </h2>
            <p className="mp-muted mp-inline-form__hint">
              Supervisors pick a process first, then a machine inside it.
            </p>
            <div className="mp-inline-form__row mp-inline-form__row--actions">
              <label className="mp-inline-form__field mp-inline-form__field--name">
                Process name
                <input
                  required
                  value={processForm.name}
                  onChange={(e) => setProcessForm({ name: e.target.value })}
                  placeholder="e.g. Aluminium Stranding"
                />
              </label>
              <div className="mp-inline-form__field mp-inline-form__field--machines">
                Machines ({processMachineIds.length})
                <MachineMultiSelect
                  machines={machines}
                  value={processMachineIds}
                  onChange={setProcessMachineIds}
                  placeholder="Select machines…"
                  searchPlaceholder="Search machines…"
                />
              </div>
              <div className="mp-inline-form__actions">
                {editingProcessId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetProcessForm}
                    disabled={processSaving}
                  >
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" disabled={processSaving}>
                  {processSaving
                    ? "Saving…"
                    : editingProcessId
                      ? "Save process"
                      : "Add process"}
                </Button>
              </div>
            </div>
          </form>

          {processesTableLoading ? (
            <TablePageLoadingSkeleton
              rows={6}
              label="Loading processes"
              showChrome={false}
            />
          ) : (
            <>
              <div className="mp-table-wrap mp-table-wrap--full">
                <table className="mp-table mp-table--admin mp-table--processes">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Process</th>
                      <th>Machines</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processesTable.map((p, i) => {
                      const globalIndex =
                        (processesPage - 1) * processesPageSize + i;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div className="mp-reorder">
                              <span className="mp-reorder__num">
                                {globalIndex + 1}
                              </span>
                              <button
                                type="button"
                                className="mp-reorder__btn"
                                aria-label={`Move ${p.name} up`}
                                disabled={globalIndex === 0}
                                onClick={() => void moveProcess(globalIndex, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="mp-reorder__btn"
                                aria-label={`Move ${p.name} down`}
                                disabled={globalIndex >= processes.length - 1}
                                onClick={() => void moveProcess(globalIndex, 1)}
                              >
                                ↓
                              </button>
                            </div>
                          </td>
                          <td>{p.name}</td>
                          <td>{p.machineCount}</td>
                          <td>
                            <label
                              className="mp-toggle"
                              title={p.isActive ? "Active" : "Inactive"}
                            >
                              <input
                                type="checkbox"
                                className="mp-toggle__input"
                                checked={p.isActive}
                                onChange={() => {
                                  setPendingToggleProcess({
                                    process: p,
                                    nextActive: !p.isActive,
                                  });
                                }}
                              />
                              <span
                                className="mp-toggle__track"
                                aria-hidden="true"
                              />
                            </label>
                          </td>
                          <td className="mp-table__actions">
                            <ReportRowActions
                              onEdit={() => editProcess(p)}
                              onDelete={() =>
                                setPendingDelete({ kind: "process", id: p.id })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {processesTable.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="mp-muted">
                          No processes yet. Add one using the form above.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={processesPage}
                pageSize={processesPageSize}
                total={processesTotal}
                onPageChange={setProcessesPage}
                onPageSizeChange={(nextSize) => {
                  setProcessesPageSize(nextSize);
                  setProcessesPage(1);
                }}
              />
            </>
          )}
        </div>
      ) : (
        <div className="mp-cable-admin">
          <div className="mp-inline-form mp-inline-form--cable-scope">
            <h2 className="mp-inline-form__title">Process &amp; machine</h2>
            <p className="mp-muted mp-inline-form__hint">
              Cable type and size lists are linked to this process + machine.
              Supervisors only see these options when filling that form.
            </p>
            <div className="mp-inline-form__row">
              <label className="mp-inline-form__field" htmlFor="cable-process">
                Process
                <SelectMenu
                  id="cable-process"
                  value={cableProcessId}
                  placeholder="Select process"
                  items={processes
                    .filter((p) => p.isActive)
                    .map((p) => ({ value: p.id, label: p.name }))}
                  onChange={(next) => {
                    setCableProcessId(next);
                    setEditingCableTypeId(null);
                    setEditingCableSizeId(null);
                    setCableTypeForm({ name: "" });
                    setCableSizeForm({ name: "" });
                  }}
                />
              </label>
              <label className="mp-inline-form__field" htmlFor="cable-machine">
                Machine
                <span
                  className={cableMachineHint ? "mp-disabled-hint" : undefined}
                  title={cableMachineHint}
                >
                  <SelectMenu
                    id="cable-machine"
                    value={cableMachineId}
                    placeholder="Select machine"
                    disabled={!cableProcessId}
                    searchable
                    searchPlaceholder="Search machines…"
                    items={cableMachinesForProcess.map((m) => ({
                      value: m.id,
                      label: m.name,
                      searchText: m.code,
                    }))}
                    onChange={(next) => {
                      setCableMachineId(next);
                      setEditingCableTypeId(null);
                      setEditingCableSizeId(null);
                      setCableTypeForm({ name: "" });
                      setCableSizeForm({ name: "" });
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          <form
            className="mp-inline-form mp-inline-form--machine mp-cable-panel mp-cable-panel--form"
            onSubmit={(e) => void saveCableType(e)}
            title={cableTypeHint}
          >
            <h2 className="mp-inline-form__title">
              {editingCableTypeId ? "Edit cable type" : "Add cable type"}
            </h2>
            <p
              className="mp-muted mp-inline-form__hint mp-inline-form__hint--inline mp-cable-form-hint"
              aria-hidden={!cableProcessId || !cableMachineId}
            >
              {cableProcessId && cableMachineId
                ? "Types for the selected process + machine"
                : "\u00a0"}
            </p>
            <label
              className={`mp-inline-form__field${cableTypeHint ? " mp-disabled-hint" : ""}`}
              title={cableTypeHint}
            >
                Name
                <input
                  required
                  value={cableTypeForm.name}
                  onChange={(e) => setCableTypeForm({ name: e.target.value })}
                  placeholder="e.g. Signalling Cable"
                  disabled={!cableProcessId || !cableMachineId}
                />
              </label>
              <div className="mp-inline-form__actions">
                {editingCableTypeId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingCableTypeId(null);
                      setCableTypeForm({ name: "" });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
                <span
                  className={cableTypeHint ? "mp-disabled-hint" : undefined}
                  title={cableTypeHint}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!cableProcessId || !cableMachineId}
                    onClick={() => void addOthersCableType()}
                  >
                    Add Others
                  </Button>
                </span>
                <span
                  className={cableTypeHint ? "mp-disabled-hint" : undefined}
                  title={cableTypeHint}
                >
                  <Button
                    type="submit"
                    disabled={!cableProcessId || !cableMachineId}
                  >
                    {editingCableTypeId ? "Save" : "Add type"}
                  </Button>
                </span>
              </div>
          </form>

          <form
            className="mp-inline-form mp-inline-form--machine mp-cable-panel mp-cable-panel--form"
            onSubmit={(e) => void saveCableSize(e)}
            title={cableSizeHint}
          >
            <h2 className="mp-inline-form__title">
              {editingCableSizeId ? "Edit cable size" : "Add cable size"}
            </h2>
            <p className="mp-muted mp-inline-form__hint mp-inline-form__hint--inline mp-cable-form-hint">
              {selectedCableTypeId
                ? `For type: ${
                    cableTypes.find((t) => t.id === selectedCableTypeId)
                      ?.name ?? "—"
                  }`
                : "Select a cable type on the left first."}
            </p>
            <label
              className={`mp-inline-form__field${cableSizeHint ? " mp-disabled-hint" : ""}`}
              title={cableSizeHint}
            >
              Size name
              <input
                required
                value={cableSizeForm.name}
                onChange={(e) => setCableSizeForm({ name: e.target.value })}
                placeholder="e.g. 2 Core x 2.5 sqmm"
                disabled={!selectedCableTypeId}
              />
            </label>
            <div className="mp-inline-form__actions">
              {editingCableSizeId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingCableSizeId(null);
                    setCableSizeForm({ name: "" });
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <span
                className={cableSizeHint ? "mp-disabled-hint" : undefined}
                title={cableSizeHint}
              >
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedCableTypeId}
                  onClick={() => void addOthersCableSize()}
                >
                  Add Others
                </Button>
              </span>
              <span
                className={cableSizeHint ? "mp-disabled-hint" : undefined}
                title={cableSizeHint}
              >
                <Button type="submit" disabled={!selectedCableTypeId}>
                  {editingCableSizeId ? "Save" : "Add size"}
                </Button>
              </span>
            </div>
          </form>

          <div className="mp-table-wrap mp-cable-panel mp-cable-panel--table">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Cable type</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!cableProcessId || !cableMachineId ? (
                  <tr>
                    <td colSpan={3} className="mp-muted">
                      Select process and machine above.
                    </td>
                  </tr>
                ) : (
                  cableTypes.map((t) => (
                    <tr
                      key={t.id}
                      className={
                        selectedCableTypeId === t.id
                          ? "mp-table__row mp-table__row--selected"
                          : "mp-table__row"
                      }
                      onClick={() => {
                        setSelectedCableTypeId(t.id);
                        setEditingCableSizeId(null);
                        setCableSizeForm({ name: "" });
                      }}
                    >
                      <td>{t.name}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <label
                          className="mp-toggle"
                          title={t.isActive ? "Active" : "Inactive"}
                        >
                          <input
                            type="checkbox"
                            className="mp-toggle__input"
                            checked={t.isActive}
                            onChange={() => {
                              setPendingToggleCableType({
                                type: t,
                                nextActive: !t.isActive,
                              });
                            }}
                          />
                          <span
                            className="mp-toggle__track"
                            aria-hidden="true"
                          />
                        </label>
                      </td>
                      <td
                        className="mp-table__actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ReportRowActions
                          onEdit={() => {
                            setEditingCableTypeId(t.id);
                            setCableTypeForm({ name: t.name });
                          }}
                          onDelete={() =>
                            setPendingDelete({ kind: "cableType", id: t.id })
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
                {cableProcessId &&
                cableMachineId &&
                cableTypes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="mp-muted">
                      No cable types linked yet for this process + machine.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mp-table-wrap mp-cable-panel mp-cable-panel--table">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!selectedCableTypeId ? (
                  <tr>
                    <td colSpan={3} className="mp-muted">
                      Select a cable type to manage its sizes.
                    </td>
                  </tr>
                ) : (
                  cableSizes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>
                        <label
                          className="mp-toggle"
                          title={s.isActive ? "Active" : "Inactive"}
                        >
                          <input
                            type="checkbox"
                            className="mp-toggle__input"
                            checked={s.isActive}
                            onChange={() => {
                              setPendingToggleCableSize({
                                size: s,
                                nextActive: !s.isActive,
                              });
                            }}
                          />
                          <span
                            className="mp-toggle__track"
                            aria-hidden="true"
                          />
                        </label>
                      </td>
                      <td className="mp-table__actions">
                        <ReportRowActions
                          onEdit={() => {
                            setEditingCableSizeId(s.id);
                            setCableSizeForm({ name: s.name });
                          }}
                          onDelete={() =>
                            setPendingDelete({ kind: "cableSize", id: s.id })
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
                {selectedCableTypeId && cableSizes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="mp-muted">
                      No sizes for this cable type yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {selected ? (
        <div className="mp-detail-backdrop" onClick={() => setSelected(null)}>
          <div
            className="mp-detail"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mp-detail__head">
              <h2>Production detail</h2>
              <div className="mp-detail__head-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => openEntryEdit(selected)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setPendingDelete({ kind: "entry", id: selected.id })
                  }
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            <dl className="mp-detail__grid">
              <div>
                <dt>Machine</dt>
                <dd>
                  {selected.machine?.name} ({selected.machine?.code})
                </dd>
              </div>
              <div>
                <dt>Operator name</dt>
                <dd>{selected.operatorName?.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{selected.entryDate}</dd>
              </div>
              <div>
                <dt>Shift</dt>
                <dd>{selected.shiftLabel}</dd>
              </div>
              <div>
                <dt>Slot</dt>
                <dd>{selected.slotLabel}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(selected.submittedAt).toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>Current process</dt>
                <dd>{selected.currentProcess || "—"}</dd>
              </div>
              <div>
                <dt>Cable</dt>
                <dd>
                  {selected.cableType} / {selected.cableSize}
                </dd>
              </div>
              <div>
                <dt>Production</dt>
                <dd>
                  Planned {selected.plannedProduction} · Actual{" "}
                  {selected.actualProduction} · Eff {selected.efficiencyPct}%
                </dd>
              </div>
              <div>
                <dt>Manpower</dt>
                <dd>
                  Ops {selected.operators} · Helpers {selected.helpers} · Total{" "}
                  {selected.totalManpower}
                </dd>
              </div>
              <div>
                <dt>Remarks</dt>
                <dd>{selected.remarks || "—"}</dd>
              </div>
            </dl>
            {selected.photoUrls.length > 0 ? (
              <div className="mp-detail__photos">
                {selected.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Production photo" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mp-muted">No photos attached.</p>
            )}
          </div>
        </div>
      ) : null}

      <EntryEditDrawer
        open={Boolean(editingEntry)}
        title="Edit production entry"
        fields={ENTRY_EDIT_FIELDS}
        values={entryEditValues}
        saving={entrySaving}
        error={entryEditError}
        onChange={(name, value) =>
          setEntryEditValues((prev) => ({ ...prev, [name]: value }))
        }
        onClose={closeEntryEdit}
        onSave={() => void saveEntryEdit()}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        deleting={deleting}
        onNo={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onYes={() => void confirmDelete()}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleMachine)}
        deleting={togglingMachine}
        title={
          pendingToggleMachine?.nextActive
            ? "Activate machine?"
            : "Deactivate machine?"
        }
        message={
          pendingToggleMachine?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={pendingToggleMachine?.nextActive ? "Activate" : "Deactivate"}
        onNo={() => {
          if (!togglingMachine) setPendingToggleMachine(null);
        }}
        onYes={() => void confirmToggleMachine()}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleProcess)}
        deleting={togglingProcess}
        title={
          pendingToggleProcess?.nextActive
            ? "Activate process?"
            : "Deactivate process?"
        }
        message={
          pendingToggleProcess?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={pendingToggleProcess?.nextActive ? "Activate" : "Deactivate"}
        onNo={() => {
          if (!togglingProcess) setPendingToggleProcess(null);
        }}
        onYes={() => void confirmToggleProcess()}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleCableType)}
        deleting={togglingCableType}
        title={
          pendingToggleCableType?.nextActive
            ? "Activate cable type?"
            : "Deactivate cable type?"
        }
        message={
          pendingToggleCableType?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={
          pendingToggleCableType?.nextActive ? "Activate" : "Deactivate"
        }
        onNo={() => {
          if (!togglingCableType) setPendingToggleCableType(null);
        }}
        onYes={() => void confirmToggleCableType()}
      />

      <DeleteConfirmDialog
        open={Boolean(pendingToggleCableSize)}
        deleting={togglingCableSize}
        title={
          pendingToggleCableSize?.nextActive
            ? "Activate cable size?"
            : "Deactivate cable size?"
        }
        message={
          pendingToggleCableSize?.nextActive
            ? "Are you sure you want to activate?"
            : "Are you sure you want to deactivate?"
        }
        yesLabel={
          pendingToggleCableSize?.nextActive ? "Activate" : "Deactivate"
        }
        onNo={() => {
          if (!togglingCableSize) setPendingToggleCableSize(null);
        }}
        onYes={() => void confirmToggleCableSize()}
      />
    </div>
  );
}
