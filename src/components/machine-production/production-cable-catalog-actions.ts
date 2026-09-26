import { toast } from "sonner";
import { deleteJson, postJson } from "@/lib/client-forms";
import {
  OTHERS,
  SIZE_PLACEHOLDER,
  TYPE_PLACEHOLDER,
  type CableOption,
  type MachineCard,
} from "@/components/machine-production/production-entry-types";

type CatalogMutators = {
  machine: MachineCard | null;
  processName: string | null;
  otherCableType: string;
  otherCableSize: string;
  cableType: string;
  selectedTypeRow: CableOption | undefined;
  selectedSizeRow: CableOption | undefined;
  setCatalogBusy: (busy: boolean) => void;
  loadTypes: () => Promise<void>;
  loadSizes: (typeId: string) => Promise<void>;
  setCableType: (v: string) => void;
  setCableSize: (v: string) => void;
  setOtherCableType: (v: string) => void;
  setOtherCableSize: (v: string) => void;
  setCableSizeRows: (rows: CableOption[]) => void;
};

export async function addOtherType(m: CatalogMutators) {
  if (!m.machine || !m.processName) return;
  const name = m.otherCableType.trim();
  if (!name) {
    toast.error("Enter the other cable type");
    return;
  }
  if (name === OTHERS) {
    toast.error("Pick a different name than Others");
    return;
  }
  m.setCatalogBusy(true);
  const res = await postJson<{
    ok: boolean;
    type?: CableOption;
    error?: string;
  }>("/api/machine-production/cable-types", {
    machineId: m.machine.id,
    processName: m.processName,
    name,
  });
  m.setCatalogBusy(false);
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  await m.loadTypes();
  m.setCableType(name);
  m.setOtherCableType("");
  toast.success(`Added “${name}” to this machine’s cable types`);
}

export async function addOtherSize(m: CatalogMutators) {
  if (!m.machine || !m.processName) return;
  const sizeName = m.otherCableSize.trim();
  if (!sizeName) {
    toast.error("Enter the other cable size");
    return;
  }
  if (sizeName === OTHERS) {
    toast.error("Pick a different name than Others");
    return;
  }

  m.setCatalogBusy(true);
  let typeId = m.selectedTypeRow?.id;
  let typeName = m.cableType;

  if (m.cableType === OTHERS) {
    const newType = m.otherCableType.trim();
    if (!newType) {
      m.setCatalogBusy(false);
      toast.error("Enter the other cable type first");
      return;
    }
    const typeRes = await postJson<{
      ok: boolean;
      type?: CableOption;
      error?: string;
    }>("/api/machine-production/cable-types", {
      machineId: m.machine.id,
      processName: m.processName,
      name: newType,
    });
    if (!typeRes.ok || !typeRes.data.type) {
      m.setCatalogBusy(false);
      toast.error(typeRes.ok ? "Failed to add cable type" : typeRes.error);
      return;
    }
    typeId = typeRes.data.type.id;
    typeName = typeRes.data.type.name;
    await m.loadTypes();
    m.setCableType(typeName);
    m.setOtherCableType("");
  }

  if (!typeId) {
    m.setCatalogBusy(false);
    toast.error("Select a cable type first");
    return;
  }

  const res = await postJson<{
    ok: boolean;
    size?: CableOption;
    error?: string;
  }>("/api/machine-production/cable-sizes", {
    cableTypeId: typeId,
    name: sizeName,
  });
  m.setCatalogBusy(false);
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  await m.loadSizes(typeId);
  m.setCableSize(sizeName);
  m.setOtherCableSize("");
  toast.success(`Added “${sizeName}” to this machine’s cable sizes`);
}

export async function removeSelectedType(m: CatalogMutators) {
  if (!m.selectedTypeRow) return;
  if (
    !window.confirm(
      `Remove “${m.selectedTypeRow.name}” from this machine’s cable type list?`,
    )
  ) {
    return;
  }
  m.setCatalogBusy(true);
  const res = await deleteJson<{ ok: boolean; error?: string }>(
    `/api/machine-production/cable-types/${m.selectedTypeRow.id}`,
  );
  m.setCatalogBusy(false);
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  m.setCableType(TYPE_PLACEHOLDER);
  m.setCableSize(SIZE_PLACEHOLDER);
  m.setCableSizeRows([]);
  await m.loadTypes();
  toast.success("Cable type removed from this machine");
}

export async function removeSelectedSize(m: CatalogMutators) {
  if (!m.selectedSizeRow) return;
  if (
    !window.confirm(
      `Remove “${m.selectedSizeRow.name}” from this machine’s cable size list?`,
    )
  ) {
    return;
  }
  m.setCatalogBusy(true);
  const res = await deleteJson<{ ok: boolean; error?: string }>(
    `/api/machine-production/cable-sizes/${m.selectedSizeRow.id}`,
  );
  m.setCatalogBusy(false);
  if (!res.ok) {
    toast.error(res.error);
    return;
  }
  m.setCableSize(SIZE_PLACEHOLDER);
  if (m.selectedTypeRow) await m.loadSizes(m.selectedTypeRow.id);
  toast.success("Cable size removed from this machine");
}
