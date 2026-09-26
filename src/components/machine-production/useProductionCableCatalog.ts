"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  OTHERS,
  SIZE_PLACEHOLDER,
  TYPE_PLACEHOLDER,
  type CableOption,
  type MachineCard,
  type SlotInfo,
} from "@/components/machine-production/production-entry-types";
import {
  addOtherSize,
  addOtherType,
  removeSelectedSize,
  removeSelectedType,
} from "@/components/machine-production/production-cable-catalog-actions";

export function useProductionCableCatalog(
  open: boolean,
  machine: MachineCard | null,
  processName: string | null,
  viewSlot: SlotInfo | null,
) {
  const [cableTypeRows, setCableTypeRows] = useState<CableOption[]>([]);
  const [cableSizeRows, setCableSizeRows] = useState<CableOption[]>([]);
  const [cableType, setCableType] = useState(TYPE_PLACEHOLDER);
  const [cableSize, setCableSize] = useState(SIZE_PLACEHOLDER);
  const [otherCableType, setOtherCableType] = useState("");
  const [otherCableSize, setOtherCableSize] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);

  const cableTypes = useMemo(() => {
    const names = cableTypeRows.map((t) => t.name).filter((name) => name !== OTHERS);
    names.push(OTHERS);
    return names;
  }, [cableTypeRows]);

  const cableSizes = useMemo(() => {
    if (cableType === OTHERS) return [OTHERS];
    const names = cableSizeRows.map((s) => s.name).filter((name) => name !== OTHERS);
    names.push(OTHERS);
    return names;
  }, [cableSizeRows, cableType]);

  const loadTypes = useCallback(async () => {
    if (!machine?.id || !processName) return;
    const qs = new URLSearchParams({
      machineId: machine.id,
      processName,
    });
    try {
      const typesRes = await fetch(`/api/machine-production/cable-types?${qs}`);
      const typesJson = (await typesRes.json().catch(() => ({}))) as {
        types?: CableOption[];
        error?: string;
      };
      if (!typesRes.ok) {
        toast.error(typesJson.error ?? "Failed to load cable types");
        setCableTypeRows([]);
        return;
      }
      setCableTypeRows(typesJson.types ?? []);
    } catch {
      toast.error("Failed to load cable types");
      setCableTypeRows([]);
    }
  }, [machine?.id, processName]);

  const loadSizes = useCallback(async (typeId: string) => {
    try {
      const res = await fetch(
        `/api/machine-production/cable-sizes?cableTypeId=${encodeURIComponent(typeId)}`,
      );
      const json = (await res.json().catch(() => ({}))) as {
        sizes?: CableOption[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load cable sizes");
        setCableSizeRows([]);
        return;
      }
      setCableSizeRows(json.sizes ?? []);
    } catch {
      toast.error("Failed to load cable sizes");
      setCableSizeRows([]);
    }
  }, []);

  useEffect(() => {
    if (!open || !machine?.id || !processName) return;
    setCableType(TYPE_PLACEHOLDER);
    setCableSize(SIZE_PLACEHOLDER);
    setOtherCableType("");
    setOtherCableSize("");
    setCableSizeRows([]);
    void loadTypes();
  }, [open, machine?.id, processName, loadTypes, viewSlot]);

  useEffect(() => {
    if (!open) return;
    setCableSize(SIZE_PLACEHOLDER);
    setOtherCableSize("");
    setCableSizeRows([]);

    if (cableType === TYPE_PLACEHOLDER || cableType === OTHERS) return;

    const typeRow = cableTypeRows.find((t) => t.name === cableType);
    if (!typeRow) return;
    void loadSizes(typeRow.id);
  }, [open, cableType, cableTypeRows, loadSizes]);

  const typeOptions = useMemo(() => [TYPE_PLACEHOLDER, ...cableTypes], [cableTypes]);
  const sizeOptions = useMemo(() => [SIZE_PLACEHOLDER, ...cableSizes], [cableSizes]);

  const readOnly = false;
  const selectedTypeRow = cableTypeRows.find((t) => t.name === cableType);
  const selectedSizeRow = cableSizeRows.find((s) => s.name === cableSize);
  const canRemoveType =
    !readOnly && Boolean(selectedTypeRow) && cableType !== OTHERS && cableType !== TYPE_PLACEHOLDER;
  const canRemoveSize =
    !readOnly && Boolean(selectedSizeRow) && cableSize !== OTHERS && cableSize !== SIZE_PLACEHOLDER;

  const mutators = {
    machine,
    processName,
    otherCableType,
    otherCableSize,
    cableType,
    selectedTypeRow,
    selectedSizeRow,
    setCatalogBusy,
    loadTypes,
    loadSizes,
    setCableType,
    setCableSize,
    setOtherCableType,
    setOtherCableSize,
    setCableSizeRows,
  };

  return {
    cableType,
    setCableType,
    cableSize,
    setCableSize,
    otherCableType,
    setOtherCableType,
    otherCableSize,
    setOtherCableSize,
    cableTypes,
    cableSizes,
    typeOptions,
    sizeOptions,
    catalogBusy,
    canRemoveType,
    canRemoveSize,
    addOtherType: () => addOtherType(mutators),
    addOtherSize: () => addOtherSize(mutators),
    removeSelectedType: () => removeSelectedType(mutators),
    removeSelectedSize: () => removeSelectedSize(mutators),
  };
}

export type ProductionCableCatalog = ReturnType<typeof useProductionCableCatalog>;
