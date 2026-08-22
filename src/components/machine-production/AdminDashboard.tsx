"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { patchJson, postJson } from "@/lib/client-forms";
import { todayIstYmd } from "@/lib/machine-production/slots";

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
  actualProduction: number;
  averageEfficiency: number;
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  shift: string;
  machineId: string;
  supervisorId: string;
  cableType: string;
  status: string;
};

const EMPTY_FILTERS: Filters = {
  dateFrom: todayIstYmd(),
  dateTo: todayIstYmd(),
  shift: "",
  machineId: "",
  supervisorId: "",
  cableType: "",
  status: "",
};

export function AdminDashboard() {
  const [tab, setTab] = useState<
    "records" | "machines" | "processes" | "cable"
  >("records");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [boardSummary, setBoardSummary] = useState<Summary | null>(null);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [cableTypes, setCableTypes] = useState<CableTypeRow[]>([]);
  const [cableSizes, setCableSizes] = useState<CableSizeRow[]>([]);
  const [selectedCableTypeId, setSelectedCableTypeId] = useState("");
  const [cableTypeForm, setCableTypeForm] = useState({ name: "" });
  const [cableSizeForm, setCableSizeForm] = useState({ name: "" });
  const [editingCableTypeId, setEditingCableTypeId] = useState<string | null>(
    null,
  );
  const [editingCableSizeId, setEditingCableSizeId] = useState<string | null>(
    null,
  );
  const [supervisors, setSupervisors] = useState<
    { id: string; label: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<EntryRow | null>(null);

  const [machineForm, setMachineForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processForm, setProcessForm] = useState({ name: "" });
  const [editingProcessId, setEditingProcessId] = useState<string | null>(
    null,
  );
  /** Machines ticked for the process being created or edited. */
  const [processMachineIds, setProcessMachineIds] = useState<string[]>([]);
  const [machineSearch, setMachineSearch] = useState("");

  const loadMachines = useCallback(async () => {
    const res = await fetch("/api/machine-production/machines");
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

  const loadProcesses = useCallback(async () => {
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

  const loadCableTypes = useCallback(async () => {
    const res = await fetch("/api/machine-production/cable-types?all=1");
    const json = (await res.json()) as {
      types?: CableTypeRow[];
      error?: string;
    };
    if (!res.ok) {
      toast.error(json.error ?? "Failed to load cable types");
      return;
    }
    const types = json.types ?? [];
    setCableTypes(types);
    setSelectedCableTypeId((prev) => {
      if (prev && types.some((t) => t.id === prev)) return prev;
      return types[0]?.id ?? "";
    });
  }, []);

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

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) sp.set("dateTo", filters.dateTo);
    if (filters.shift) sp.set("shift", filters.shift);
    if (filters.machineId) sp.set("machineId", filters.machineId);
    if (filters.supervisorId) sp.set("supervisorId", filters.supervisorId);
    if (filters.cableType) sp.set("cableType", filters.cableType);
    if (filters.status) sp.set("status", filters.status);

    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/machine-production/entries?${sp}`),
        fetch(
          `/api/machine-production/summary?date=${filters.dateFrom || todayIstYmd()}${
            filters.shift ? `&shift=${filters.shift}` : ""
          }`,
        ),
      ]);
      const entriesJson = (await entriesRes.json()) as {
        entries?: EntryRow[];
        summary?: Summary;
        error?: string;
      };
      const summaryJson = (await summaryRes.json()) as {
        summary?: Summary;
        error?: string;
      };
      if (!entriesRes.ok) {
        toast.error(entriesJson.error ?? "Failed to load records");
      } else {
        setEntries(entriesJson.entries ?? []);
        setSummary(entriesJson.summary ?? null);
        const unique = new Map<string, string>();
        for (const e of entriesJson.entries ?? []) {
          if (e.supervisor) {
            unique.set(
              e.supervisor.id,
              e.supervisor.name?.trim() || e.supervisor.email,
            );
          }
        }
        setSupervisors(
          [...unique.entries()].map(([id, label]) => ({ id, label })),
        );
      }
      if (summaryRes.ok) setBoardSummary(summaryJson.summary ?? null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadMachines();
  }, [loadMachines]);

  useEffect(() => {
    if (tab === "records") void loadEntries();
    if (tab === "cable") void loadCableTypes();
  }, [tab, loadEntries, loadCableTypes]);

  useEffect(() => {
    if (tab !== "cable") return;
    void loadCableSizes(selectedCableTypeId);
  }, [tab, selectedCableTypeId, loadCableSizes]);

  useEffect(() => {
    if (tab === "processes") void loadProcesses();
  }, [tab, loadProcesses]);

  async function saveMachine(e: FormEvent) {
    e.preventDefault();
    const name = machineForm.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
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
    }
    setEditingId(null);
    setMachineForm({ name: "" });
    void loadMachines();
  }

  async function toggleActive(m: MachineRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/machines/${m.id}`,
      { isActive: !m.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(m.isActive ? "Machine deactivated" : "Machine activated");
    void loadMachines();
  }

  async function saveProcess(e: FormEvent) {
    e.preventDefault();
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
    }
    resetProcessForm();
    void loadProcesses();
  }

  async function toggleProcessActive(p: ProcessRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/processes/${p.id}`,
      { isActive: !p.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(p.isActive ? "Process deactivated" : "Process activated");
    void loadProcesses();
  }

  function editProcess(p: ProcessRow) {
    setEditingProcessId(p.id);
    setProcessForm({ name: p.name });
    setProcessMachineIds(p.machineIds);
    setMachineSearch("");
  }

  function resetProcessForm() {
    setEditingProcessId(null);
    setProcessForm({ name: "" });
    setProcessMachineIds([]);
    setMachineSearch("");
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
      void loadProcesses();
    }
  }

  function toggleProcessMachine(machineId: string) {
    setProcessMachineIds((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId],
    );
  }

  async function saveCableType(e: FormEvent) {
    e.preventDefault();
    const name = cableTypeForm.name.trim();
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
        { name },
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

  async function toggleCableType(t: CableTypeRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-types/${t.id}`,
      { isActive: !t.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.isActive ? "Cable type deactivated" : "Cable type activated");
    void loadCableTypes();
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

  async function toggleCableSize(s: CableSizeRow) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-sizes/${s.id}`,
      { isActive: !s.isActive },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(s.isActive ? "Cable size deactivated" : "Cable size activated");
    void loadCableSizes(selectedCableTypeId);
  }

  const displaySummary = tab === "records" ? summary ?? boardSummary : boardSummary ?? summary;

  return (
    <div className="mp-root">
      <div className="mp-shift-tabs">
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
            tab === "cable" ? "mp-shift-tab mp-shift-tab--active" : "mp-shift-tab"
          }
          onClick={() => setTab("cable")}
        >
          Cable type & size
        </button>
      </div>

      {tab === "records" ? (
        <>
          {displaySummary ? (
            <div className="mp-counts">
              <span className="mp-count">Total {displaySummary.total}</span>
              <span className="mp-count mp-count--ok">
                Completed {displaySummary.completed}
              </span>
              <span className="mp-count mp-count--pending">
                Pending {displaySummary.pending}
              </span>
              <span className="mp-count mp-count--overdue">
                Overdue {displaySummary.overdue}
              </span>
              <span className="mp-count">
                Actual {displaySummary.actualProduction}
              </span>
              <span className="mp-count">
                Avg eff {displaySummary.averageEfficiency}%
              </span>
            </div>
          ) : null}

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
            <label>
              Shift
              <select
                value={filters.shift}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, shift: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
              </select>
            </label>
            <label>
              Machine
              <select
                value={filters.machineId}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, machineId: e.target.value }))
                }
              >
                <option value="">All</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Supervisor
              <select
                value={filters.supervisorId}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, supervisorId: e.target.value }))
                }
              >
                <option value="">All</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cable type
              <input
                value={filters.cableType}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, cableType: e.target.value }))
                }
                placeholder="Filter…"
              />
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </label>
            <label className="mp-filters__apply">
              <span className="mp-filters__apply-spacer" aria-hidden="true">
                &nbsp;
              </span>
              <Button type="button" onClick={() => void loadEntries()}>
                Apply
              </Button>
            </label>
          </div>

          {loading ? <p className="mp-muted">Loading…</p> : null}

          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Machine</th>
                  <th>Shift / Slot</th>
                  <th>Supervisor</th>
                  <th>Process</th>
                  <th>Cable</th>
                  <th>Actual</th>
                  <th>Eff %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="mp-table__row"
                    onClick={() => setSelected(e)}
                  >
                    <td>{e.entryDate}</td>
                    <td>
                      {e.machine?.name ?? "—"}
                      <div className="mp-muted">{e.machine?.code}</div>
                    </td>
                    <td>
                      {e.shiftLabel}
                      <div className="mp-muted">{e.slotLabel}</div>
                    </td>
                    <td>
                      {e.supervisor?.name || e.supervisor?.email || "—"}
                    </td>
                    <td>{e.currentProcess || "—"}</td>
                    <td>
                      {e.cableType}
                      <div className="mp-muted">{e.cableSize}</div>
                    </td>
                    <td>{e.actualProduction}</td>
                    <td>{e.efficiencyPct}</td>
                    <td>
                      <span className={`mp-status mp-status--ok`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="mp-muted">
                      No records for these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === "machines" ? (
        <div className="mp-admin-machines">
          <form className="mp-machine-form" onSubmit={(e) => void saveMachine(e)}>
            <h2>{editingId ? "Edit machine" : "Add machine"}</h2>
            <label>
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
            <div className="mp-form__actions">
              {editingId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setMachineForm({ name: "" });
                  }}
                >
                  Cancel
                </Button>
              ) : null}
              <Button type="submit">{editingId ? "Save" : "Add machine"}</Button>
            </div>
          </form>

          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id}>
                    <td>{m.code}</td>
                    <td>
                      {m.name}
                      {m.description ? (
                        <div className="mp-muted">{m.description}</div>
                      ) : null}
                    </td>
                    <td>{m.isActive ? "Active" : "Inactive"}</td>
                    <td className="mp-table__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(m.id);
                          setMachineForm({ name: m.name });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void toggleActive(m)}
                      >
                        {m.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "processes" ? (
        <div className="mp-admin-machines">
          <form
            className="mp-machine-form mp-process-form"
            onSubmit={(e) => void saveProcess(e)}
          >
            <h2>{editingProcessId ? "Edit process" : "Add process"}</h2>
            <p className="mp-muted">
              Supervisors pick a process first, then a machine inside it.
            </p>
            <label>
              Process name
              <input
                required
                value={processForm.name}
                onChange={(e) => setProcessForm({ name: e.target.value })}
                placeholder="e.g. Aluminium Stranding"
              />
            </label>

            <div className="mp-machine-picker">
              <div className="mp-machine-picker__head">
                <span>
                  Machines in this process ({processMachineIds.length})
                </span>
                <input
                  type="search"
                  value={machineSearch}
                  onChange={(e) => setMachineSearch(e.target.value)}
                  placeholder="Search machines…"
                />
              </div>
              <div className="mp-machine-picker__list">
                {machines
                  .filter((m) => {
                    const q = machineSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      m.name.toLowerCase().includes(q) ||
                      m.code.toLowerCase().includes(q)
                    );
                  })
                  .map((m) => (
                    <label key={m.id} className="mp-machine-picker__item">
                      <input
                        type="checkbox"
                        checked={processMachineIds.includes(m.id)}
                        onChange={() => toggleProcessMachine(m.id)}
                      />
                      <span>
                        {m.name}
                        <span className="mp-muted"> · {m.code}</span>
                        {!m.isActive ? (
                          <span className="mp-muted"> (inactive)</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                {machines.length === 0 ? (
                  <p className="mp-muted">
                    No machines yet — add them on the Machines tab first.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mp-form__actions">
              {editingProcessId ? (
                <Button type="button" variant="ghost" onClick={resetProcessForm}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit">
                {editingProcessId ? "Save process" : "Add process"}
              </Button>
            </div>
          </form>

          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Process</th>
                  <th>Machines</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <div className="mp-reorder">
                        <span className="mp-reorder__num">{i + 1}</span>
                        <button
                          type="button"
                          className="mp-reorder__btn"
                          aria-label={`Move ${p.name} up`}
                          disabled={i === 0}
                          onClick={() => void moveProcess(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="mp-reorder__btn"
                          aria-label={`Move ${p.name} down`}
                          disabled={i === processes.length - 1}
                          onClick={() => void moveProcess(i, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td>{p.name}</td>
                    <td>{p.machineCount}</td>
                    <td>{p.isActive ? "Active" : "Inactive"}</td>
                    <td className="mp-table__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => editProcess(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void toggleProcessActive(p)}
                      >
                        {p.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="mp-muted">
                      No processes yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mp-cable-admin">
          <div className="mp-admin-machines">
            <form
              className="mp-machine-form"
              onSubmit={(e) => void saveCableType(e)}
            >
              <h2>
                {editingCableTypeId ? "Edit cable type" : "Add cable type"}
              </h2>
              <p className="mp-muted">
                Shared for all machines. Sizes are managed per cable type.
              </p>
              <label>
                Name
                <input
                  required
                  value={cableTypeForm.name}
                  onChange={(e) => setCableTypeForm({ name: e.target.value })}
                  placeholder="e.g. CAT6"
                />
              </label>
              <div className="mp-form__actions">
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
                <Button type="submit">
                  {editingCableTypeId ? "Save" : "Add type"}
                </Button>
              </div>
            </form>

            <div className="mp-table-wrap">
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>Cable type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cableTypes.map((t) => (
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
                      <td>{t.isActive ? "Active" : "Inactive"}</td>
                      <td className="mp-table__actions">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCableTypeId(t.id);
                            setCableTypeForm({ name: t.name });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            void toggleCableType(t);
                          }}
                        >
                          {t.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {cableTypes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="mp-muted">
                        No cable types yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mp-admin-machines">
            <form
              className="mp-machine-form"
              onSubmit={(e) => void saveCableSize(e)}
            >
              <h2>
                {editingCableSizeId ? "Edit cable size" : "Add cable size"}
              </h2>
              <p className="mp-muted">
                {selectedCableTypeId
                  ? `For type: ${
                      cableTypes.find((t) => t.id === selectedCableTypeId)
                        ?.name ?? "—"
                    }`
                  : "Select a cable type on the left first."}
              </p>
              <label>
                Size name
                <input
                  required
                  value={cableSizeForm.name}
                  onChange={(e) => setCableSizeForm({ name: e.target.value })}
                  placeholder="e.g. 1.5 sqmm"
                  disabled={!selectedCableTypeId}
                />
              </label>
              <div className="mp-form__actions">
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
                <Button type="submit" disabled={!selectedCableTypeId}>
                  {editingCableSizeId ? "Save" : "Add size"}
                </Button>
              </div>
            </form>

            <div className="mp-table-wrap">
              <table className="mp-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Status</th>
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
                        <td>{s.isActive ? "Active" : "Inactive"}</td>
                        <td className="mp-table__actions">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEditingCableSizeId(s.id);
                              setCableSizeForm({ name: s.name });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void toggleCableSize(s)}
                          >
                            {s.isActive ? "Deactivate" : "Activate"}
                          </Button>
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>
            <dl className="mp-detail__grid">
              <div>
                <dt>Machine</dt>
                <dd>
                  {selected.machine?.name} ({selected.machine?.code})
                </dd>
              </div>
              <div>
                <dt>Supervisor</dt>
                <dd>
                  {selected.supervisor?.name || selected.supervisor?.email}
                </dd>
              </div>
              <div>
                <dt>Date / Shift / Slot</dt>
                <dd>
                  {selected.entryDate} · {selected.shiftLabel} ·{" "}
                  {selected.slotLabel}
                </dd>
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
    </div>
  );
}
