"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_REPORT_PAGE_SIZE } from "@/components/pnl/usePaginatedReport";
import { patchJson, postJson } from "@/lib/client-forms";
import type {
  AdminTab,
  ProcessRow,
} from "@/components/machine-production/admin-dashboard-model";

export function useAdminProcesses(tab: AdminTab) {
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
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
  /** Machines ticked for the process being created or edited. */
  const [processMachineIds, setProcessMachineIds] = useState<string[]>([]);

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

  useEffect(() => {
    void loadAllProcesses();
  }, [loadAllProcesses]);

  useEffect(() => {
    if (tab === "processes") void loadProcessesTable();
  }, [tab, processesPage, processesPageSize, loadProcessesTable]);

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

  return {
    processes,
    processForm,
    setProcessForm,
    editingProcessId,
    processSaving,
    processesTable,
    processesPage,
    setProcessesPage,
    processesPageSize,
    setProcessesPageSize,
    processesTotal,
    processesTableLoading,
    pendingToggleProcess,
    setPendingToggleProcess,
    togglingProcess,
    processMachineIds,
    setProcessMachineIds,
    loadAllProcesses,
    saveProcess,
    confirmToggleProcess,
    editProcess,
    resetProcessForm,
    moveProcess,
    refreshProcesses,
  };
}
