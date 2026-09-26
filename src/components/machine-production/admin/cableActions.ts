import { FormEvent } from "react";
import { toast } from "sonner";
import { patchJson, postJson } from "@/lib/client-forms";
import type {
  CableSizeRow,
  CableTypeRow,
} from "@/components/machine-production/admin-dashboard-model";

export async function saveCableTypeAction(args: {
  e: FormEvent;
  name: string;
  cableProcessId: string;
  cableMachineId: string;
  editingCableTypeId: string | null;
  onSaved: () => void;
  loadCableTypes: () => void;
}) {
  args.e.preventDefault();
  const name = args.name.trim();
  if (!args.cableProcessId || !args.cableMachineId) {
    toast.error("Select a process and machine first");
    return;
  }
  if (!name) {
    toast.error("Cable type name is required");
    return;
  }
  if (args.editingCableTypeId) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-types/${args.editingCableTypeId}`,
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
        processId: args.cableProcessId,
        machineId: args.cableMachineId,
        name,
      },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Cable type added");
  }
  args.onSaved();
  void args.loadCableTypes();
}

export async function addOthersCableTypeAction(args: {
  cableProcessId: string;
  cableMachineId: string;
  cableTypes: CableTypeRow[];
  loadCableTypes: () => void;
}) {
  if (!args.cableProcessId || !args.cableMachineId) {
    toast.error("Select a process and machine first");
    return;
  }
  if (args.cableTypes.some((t) => t.name === "Others")) {
    toast.message("Others is already linked");
    return;
  }
  const res = await postJson<{ ok: boolean; error?: string }>(
    "/api/machine-production/cable-types",
    {
      processId: args.cableProcessId,
      machineId: args.cableMachineId,
      name: "Others",
    },
  );
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  toast.success("Others added");
  void args.loadCableTypes();
}

export async function toggleCableTypeAction(t: CableTypeRow) {
  const res = await patchJson<{ ok: boolean; error?: string }>(
    `/api/machine-production/cable-types/${t.id}`,
    { isActive: !t.isActive },
  );
  if (!res.ok) {
    toast.error(res.error);
    return false;
  }
  toast.success(t.isActive ? "Cable type deactivated" : "Cable type activated");
  return true;
}

export async function saveCableSizeAction(args: {
  e: FormEvent;
  name: string;
  selectedCableTypeId: string;
  editingCableSizeId: string | null;
  onSaved: () => void;
  loadCableSizes: (id: string) => void;
}) {
  args.e.preventDefault();
  const name = args.name.trim();
  if (!args.selectedCableTypeId) {
    toast.error("Select a cable type first");
    return;
  }
  if (!name) {
    toast.error("Cable size name is required");
    return;
  }
  if (args.editingCableSizeId) {
    const res = await patchJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-sizes/${args.editingCableSizeId}`,
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
      { cableTypeId: args.selectedCableTypeId, name },
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Cable size added");
  }
  args.onSaved();
  void args.loadCableSizes(args.selectedCableTypeId);
}

export async function addOthersCableSizeAction(args: {
  selectedCableTypeId: string;
  cableSizes: CableSizeRow[];
  loadCableSizes: (id: string) => void;
}) {
  if (!args.selectedCableTypeId) {
    toast.error("Select a cable type first");
    return;
  }
  if (args.cableSizes.some((s) => s.name === "Others")) {
    toast.message("Others is already linked");
    return;
  }
  const res = await postJson<{ ok: boolean; error?: string }>(
    "/api/machine-production/cable-sizes",
    { cableTypeId: args.selectedCableTypeId, name: "Others" },
  );
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  toast.success("Others size added");
  void args.loadCableSizes(args.selectedCableTypeId);
}

export async function toggleCableSizeAction(s: CableSizeRow) {
  const res = await patchJson<{ ok: boolean; error?: string }>(
    `/api/machine-production/cable-sizes/${s.id}`,
    { isActive: !s.isActive },
  );
  if (!res.ok) {
    toast.error(res.error);
    return false;
  }
  toast.success(s.isActive ? "Cable size deactivated" : "Cable size activated");
  return true;
}
