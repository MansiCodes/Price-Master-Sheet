"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_REPORT_PAGE_SIZE } from "@/components/pnl/usePaginatedReport";
import { patchJson, postJson } from "@/lib/client-forms";
import type {
  AdminTab,
  MachineRow,
} from "@/components/machine-production/admin-dashboard-model";

export function useAdminMachines(tab: AdminTab) {
  const [machines, setMachines] = useState<MachineRow[]>([]);
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
  const [pendingToggleMachine, setPendingToggleMachine] = useState<{
    machine: MachineRow;
    nextActive: boolean;
  } | null>(null);
  const [togglingMachine, setTogglingMachine] = useState(false);

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

  useEffect(() => {
    void loadAllMachines();
  }, [loadAllMachines]);

  useEffect(() => {
    if (tab === "machines") void loadMachinesTable();
  }, [tab, machinesPage, machinesPageSize, loadMachinesTable]);

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

  return {
    machines,
    machineForm,
    setMachineForm,
    editingId,
    machineSaving,
    machinesTable,
    machinesPage,
    setMachinesPage,
    machinesPageSize,
    setMachinesPageSize,
    machinesTotal,
    machinesTableLoading,
    pendingToggleMachine,
    setPendingToggleMachine,
    togglingMachine,
    startEditMachine,
    resetMachineForm,
    saveMachine,
    confirmToggleMachine,
    refreshMachines,
  };
}
