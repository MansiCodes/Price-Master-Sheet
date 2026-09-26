"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addOthersCableSizeAction,
  addOthersCableTypeAction,
  saveCableSizeAction,
  saveCableTypeAction,
  toggleCableSizeAction,
  toggleCableTypeAction,
} from "@/components/machine-production/admin/cableActions";
import type {
  AdminTab,
  CableSizeRow,
  CableTypeRow,
  MachineRow,
  ProcessRow,
} from "@/components/machine-production/admin-dashboard-model";

export function useAdminCable(
  tab: AdminTab,
  processes: ProcessRow[],
  machines: MachineRow[],
) {
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

  useEffect(() => {
    if (tab !== "cable") return;
    void loadCableSizes(selectedCableTypeId);
  }, [tab, selectedCableTypeId, loadCableSizes]);

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

  async function saveCableType(e: FormEvent) {
    await saveCableTypeAction({
      e,
      name: cableTypeForm.name,
      cableProcessId,
      cableMachineId,
      editingCableTypeId,
      onSaved: () => {
        setEditingCableTypeId(null);
        setCableTypeForm({ name: "" });
      },
      loadCableTypes,
    });
  }

  async function addOthersCableType() {
    await addOthersCableTypeAction({
      cableProcessId,
      cableMachineId,
      cableTypes,
      loadCableTypes,
    });
  }

  async function confirmToggleCableType() {
    if (!pendingToggleCableType || togglingCableType) return;
    setTogglingCableType(true);
    try {
      const ok = await toggleCableTypeAction(pendingToggleCableType.type);
      if (ok) {
        void loadCableTypes();
        setPendingToggleCableType(null);
      }
    } finally {
      setTogglingCableType(false);
    }
  }

  async function saveCableSize(e: FormEvent) {
    await saveCableSizeAction({
      e,
      name: cableSizeForm.name,
      selectedCableTypeId,
      editingCableSizeId,
      onSaved: () => {
        setEditingCableSizeId(null);
        setCableSizeForm({ name: "" });
      },
      loadCableSizes,
    });
  }

  async function addOthersCableSize() {
    await addOthersCableSizeAction({
      selectedCableTypeId,
      cableSizes,
      loadCableSizes,
    });
  }

  async function confirmToggleCableSize() {
    if (!pendingToggleCableSize || togglingCableSize) return;
    setTogglingCableSize(true);
    try {
      const ok = await toggleCableSizeAction(pendingToggleCableSize.size);
      if (ok) {
        void loadCableSizes(selectedCableTypeId);
        setPendingToggleCableSize(null);
      }
    } finally {
      setTogglingCableSize(false);
    }
  }

  const cableMachineHint = !cableProcessId
    ? "First select the process"
    : undefined;
  const cableTypeHint = !cableProcessId
    ? "First select the process"
    : !cableMachineId
      ? "Please select the machine first"
      : undefined;
  const cableSizeHint = !selectedCableTypeId
    ? "Please select a cable type first"
    : undefined;

  return {
    cableTypes,
    cableSizes,
    cableProcessId,
    setCableProcessId,
    cableMachineId,
    setCableMachineId,
    selectedCableTypeId,
    setSelectedCableTypeId,
    cableTypeForm,
    setCableTypeForm,
    cableSizeForm,
    setCableSizeForm,
    editingCableTypeId,
    setEditingCableTypeId,
    editingCableSizeId,
    setEditingCableSizeId,
    pendingToggleCableType,
    setPendingToggleCableType,
    pendingToggleCableSize,
    setPendingToggleCableSize,
    togglingCableType,
    togglingCableSize,
    loadCableTypes,
    loadCableSizes,
    cableMachinesForProcess,
    saveCableType,
    addOthersCableType,
    confirmToggleCableType,
    saveCableSize,
    addOthersCableSize,
    confirmToggleCableSize,
    cableMachineHint,
    cableTypeHint,
    cableSizeHint,
  };
}
