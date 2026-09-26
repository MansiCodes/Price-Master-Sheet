"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteJson } from "@/lib/client-forms";
import { useAdminCable } from "@/components/machine-production/admin/useAdminCable";
import { useAdminMachines } from "@/components/machine-production/admin/useAdminMachines";
import { useAdminProcesses } from "@/components/machine-production/admin/useAdminProcesses";
import { useAdminRecords } from "@/components/machine-production/admin/useAdminRecords";
import type {
  AdminTab,
  PendingDelete,
} from "@/components/machine-production/admin-dashboard-model";

export function useAdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("records");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const machines = useAdminMachines(tab);
  const processes = useAdminProcesses(tab);
  const cable = useAdminCable(tab, processes.processes, machines.machines);
  const records = useAdminRecords();

  useEffect(() => {
    if (tab === "records") void records.loadEntries();
    if (tab === "cable") {
      void processes.loadAllProcesses();
      void cable.loadCableTypes();
    }
  }, [
    tab,
    records.filters,
    records.entriesPage,
    records.entriesPageSize,
    records.loadEntries,
    cable.loadCableTypes,
    processes.loadAllProcesses,
  ]);

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
      records.setSelected((s) => (s?.id === id ? null : s));
      void records.loadEntries();
    } else if (kind === "machine") {
      if (machines.editingId === id) machines.resetMachineForm();
      await machines.refreshMachines();
    } else if (kind === "process") {
      if (processes.editingProcessId === id) processes.resetProcessForm();
      await processes.refreshProcesses();
    } else if (kind === "cableType") {
      if (cable.editingCableTypeId === id) {
        cable.setEditingCableTypeId(null);
        cable.setCableTypeForm({ name: "" });
      }
      void cable.loadCableTypes();
    } else {
      if (cable.editingCableSizeId === id) {
        cable.setEditingCableSizeId(null);
        cable.setCableSizeForm({ name: "" });
      }
      void cable.loadCableSizes(cable.selectedCableTypeId);
    }
  }

  const displaySummary =
    tab === "records"
      ? records.summary ?? records.boardSummary
      : records.boardSummary ?? records.summary;

  return {
    tab,
    setTab,
    displaySummary,
    records,
    machines,
    processes,
    cable,
    pendingDelete,
    setPendingDelete,
    deleting,
    confirmDelete,
  };
}
