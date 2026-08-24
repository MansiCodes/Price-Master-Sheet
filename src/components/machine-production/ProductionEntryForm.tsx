"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LivePhotoUpload } from "@/components/machine-production/LivePhotoUpload";
import { Button } from "@/components/ui/Button";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { SlideOver } from "@/components/ui/SlideOver";
import { deleteJson, postJson } from "@/lib/client-forms";

export type MachineCard = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  entryId: string | null;
  actualProduction: number | null;
  efficiencyPct: number | null;
  submittedAt: string | null;
};

export type SlotInfo = {
  shift: "DAY" | "NIGHT";
  entryDate: string;
  slotStartHour: number;
  slotLabel: string;
  deadlineIso: string;
  deadlineLabel: string;
};

const TYPE_PLACEHOLDER = "Select cable type";
const SIZE_PLACEHOLDER = "Select cable size";
const OTHERS = "Others";

type CableOption = { id: string; name: string };

type Props = {
  open: boolean;
  machine: MachineCard | null;
  viewSlot: SlotInfo | null;
  processName: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ProductionEntryForm({
  open,
  machine,
  viewSlot,
  processName,
  onClose,
  onSaved,
}: Props) {
  const [cableTypeRows, setCableTypeRows] = useState<CableOption[]>([]);
  const [cableSizeRows, setCableSizeRows] = useState<CableOption[]>([]);
  const [cableType, setCableType] = useState(TYPE_PLACEHOLDER);
  const [cableSize, setCableSize] = useState(SIZE_PLACEHOLDER);
  const [otherCableType, setOtherCableType] = useState("");
  const [otherCableSize, setOtherCableSize] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [operators, setOperators] = useState("1");
  const [helpers, setHelpers] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [catalogBusy, setCatalogBusy] = useState(false);

  const cableTypes = useMemo(() => {
    const names = cableTypeRows.map((t) => t.name);
    if (!names.includes(OTHERS)) names.push(OTHERS);
    return names;
  }, [cableTypeRows]);

  const cableSizes = useMemo(() => {
    if (cableType === OTHERS) return [OTHERS];
    const names = cableSizeRows.map((s) => s.name);
    if (!names.includes(OTHERS)) names.push(OTHERS);
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
    setPlanned("");
    setActual("");
    setOperators("1");
    setHelpers("0");
    setRemarks("");
    setPhotoUrls([]);
    void loadTypes();
  }, [open, machine?.id, processName, loadTypes]);

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

  const plannedNum = Number(planned) || 0;
  const actualNum = Number(actual) || 0;
  const ops = Math.max(0, Math.floor(Number(operators) || 0));
  const helps = Math.max(0, Math.floor(Number(helpers) || 0));
  const totalManpower = ops + helps;
  const efficiency =
    plannedNum > 0 ? Math.round((actualNum / plannedNum) * 10000) / 100 : 0;

  const typeOptions = useMemo(
    () => [TYPE_PLACEHOLDER, ...cableTypes],
    [cableTypes],
  );
  const sizeOptions = useMemo(
    () => [SIZE_PLACEHOLDER, ...cableSizes],
    [cableSizes],
  );

  const dateTimeLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
  }, [open]);

  const readOnly = machine?.status === "COMPLETED";
  const selectedTypeRow = cableTypeRows.find((t) => t.name === cableType);
  const selectedSizeRow = cableSizeRows.find((s) => s.name === cableSize);
  const canRemoveType =
    !readOnly &&
    Boolean(selectedTypeRow) &&
    cableType !== OTHERS &&
    cableType !== TYPE_PLACEHOLDER;
  const canRemoveSize =
    !readOnly &&
    Boolean(selectedSizeRow) &&
    cableSize !== OTHERS &&
    cableSize !== SIZE_PLACEHOLDER;

  async function addOtherType() {
    if (!machine || !processName) return;
    const name = otherCableType.trim();
    if (!name) {
      toast.error("Enter the other cable type");
      return;
    }
    if (name === OTHERS) {
      toast.error("Pick a different name than Others");
      return;
    }
    setCatalogBusy(true);
    const res = await postJson<{
      ok: boolean;
      type?: CableOption;
      error?: string;
    }>("/api/machine-production/cable-types", {
      machineId: machine.id,
      processName,
      name,
    });
    setCatalogBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await loadTypes();
    setCableType(name);
    setOtherCableType("");
    toast.success(`Added “${name}” to this machine’s cable types`);
  }

  async function addOtherSize() {
    if (!machine || !processName) return;
    const sizeName = otherCableSize.trim();
    if (!sizeName) {
      toast.error("Enter the other cable size");
      return;
    }
    if (sizeName === OTHERS) {
      toast.error("Pick a different name than Others");
      return;
    }

    setCatalogBusy(true);
    let typeId = selectedTypeRow?.id;
    let typeName = cableType;

    if (cableType === OTHERS) {
      const newType = otherCableType.trim();
      if (!newType) {
        setCatalogBusy(false);
        toast.error("Enter the other cable type first");
        return;
      }
      const typeRes = await postJson<{
        ok: boolean;
        type?: CableOption;
        error?: string;
      }>("/api/machine-production/cable-types", {
        machineId: machine.id,
        processName,
        name: newType,
      });
      if (!typeRes.ok || !typeRes.data.type) {
        setCatalogBusy(false);
        toast.error(typeRes.ok ? "Failed to add cable type" : typeRes.error);
        return;
      }
      typeId = typeRes.data.type.id;
      typeName = typeRes.data.type.name;
      await loadTypes();
      setCableType(typeName);
      setOtherCableType("");
    }

    if (!typeId) {
      setCatalogBusy(false);
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
    setCatalogBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await loadSizes(typeId);
    setCableSize(sizeName);
    setOtherCableSize("");
    toast.success(`Added “${sizeName}” to this machine’s cable sizes`);
  }

  async function removeSelectedType() {
    if (!selectedTypeRow) return;
    if (
      !window.confirm(
        `Remove “${selectedTypeRow.name}” from this machine’s cable type list?`,
      )
    ) {
      return;
    }
    setCatalogBusy(true);
    const res = await deleteJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-types/${selectedTypeRow.id}`,
    );
    setCatalogBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setCableType(TYPE_PLACEHOLDER);
    setCableSize(SIZE_PLACEHOLDER);
    setCableSizeRows([]);
    await loadTypes();
    toast.success("Cable type removed from this machine");
  }

  async function removeSelectedSize() {
    if (!selectedSizeRow) return;
    if (
      !window.confirm(
        `Remove “${selectedSizeRow.name}” from this machine’s cable size list?`,
      )
    ) {
      return;
    }
    setCatalogBusy(true);
    const res = await deleteJson<{ ok: boolean; error?: string }>(
      `/api/machine-production/cable-sizes/${selectedSizeRow.id}`,
    );
    setCatalogBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setCableSize(SIZE_PLACEHOLDER);
    if (selectedTypeRow) await loadSizes(selectedTypeRow.id);
    toast.success("Cable size removed from this machine");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machine || !viewSlot || readOnly) return;
    if (!processName) {
      toast.error("Open a process first, then pick a machine inside it");
      return;
    }

    let finalType = cableType;
    let finalSize = cableSize;

    if (!cableType || cableType === TYPE_PLACEHOLDER) {
      toast.error("Select a cable type");
      return;
    }
    if (cableType === OTHERS) {
      finalType = otherCableType.trim();
      if (!finalType) {
        toast.error("Enter the other cable type");
        return;
      }
    } else if (!cableTypes.includes(cableType)) {
      toast.error("Select a cable type");
      return;
    }

    if (!cableSize || cableSize === SIZE_PLACEHOLDER) {
      toast.error("Select a cable size");
      return;
    }
    if (cableSize === OTHERS) {
      finalSize = otherCableSize.trim();
      if (!finalSize) {
        toast.error("Enter the other cable size");
        return;
      }
    } else if (cableType === OTHERS) {
      finalSize = cableSize === OTHERS ? otherCableSize.trim() : cableSize;
      if (!finalSize) {
        toast.error("Select or enter a cable size");
        return;
      }
    } else if (!cableSizes.includes(cableSize)) {
      toast.error("Select a cable size");
      return;
    }

    if (plannedNum < 0 || actualNum < 0) {
      toast.error("Production values must be zero or more");
      return;
    }

    setSaving(true);
    const res = await postJson<{ ok: boolean; error?: string }>(
      "/api/machine-production/entries",
      {
        machineId: machine.id,
        entryDate: viewSlot.entryDate,
        shift: viewSlot.shift,
        slotStartHour: viewSlot.slotStartHour,
        currentProcess: processName,
        cableType: finalType,
        cableSize: finalSize,
        plannedProduction: plannedNum,
        actualProduction: actualNum,
        operators: ops,
        helpers: helps,
        remarks: remarks.trim() || null,
        photoUrls,
      },
    );
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Production entry saved");
    onSaved();
    onClose();
  }

  const busy = readOnly || saving || catalogBusy;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={
        machine
          ? `${machine.name}${viewSlot ? ` · ${viewSlot.slotLabel}` : ""}`
          : "Production entry"
      }
    >
      {machine && viewSlot ? (
        <form className="mp-form" onSubmit={(e) => void onSubmit(e)}>
          {readOnly ? (
            <p className="mp-form__banner mp-form__banner--ok">
              Already submitted for this slot.
            </p>
          ) : null}

          <label className="mp-field">
            <span>Machine</span>
            <input value={`${machine.name} (${machine.code})`} readOnly />
          </label>

          <label className="mp-field">
            <span>Current process</span>
            <input value={processName ?? "—"} readOnly />
          </label>

          <div className="mp-field">
            <span>Cable type</span>
            <SelectMenu
              value={cableType}
              options={typeOptions}
              placeholder={TYPE_PLACEHOLDER}
              onChange={(v) => {
                setCableType(v);
                setCableSize(SIZE_PLACEHOLDER);
                setOtherCableType("");
                setOtherCableSize("");
              }}
              disabled={busy || cableTypes.length === 0}
            />
            {cableType === OTHERS ? (
              <div className="mp-field__extra-row">
                <input
                  className="mp-field__extra"
                  value={otherCableType}
                  onChange={(e) => setOtherCableType(e.target.value)}
                  placeholder="Enter other cable type"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !otherCableType.trim()}
                  onClick={() => void addOtherType()}
                >
                  Add to list
                </Button>
              </div>
            ) : null}
            {canRemoveType ? (
              <button
                type="button"
                className="mp-field__remove"
                disabled={busy}
                onClick={() => void removeSelectedType()}
              >
                Remove from this machine
              </button>
            ) : null}
          </div>

          <div className="mp-field">
            <span>Cable size</span>
            <SelectMenu
              value={cableSize}
              options={sizeOptions}
              placeholder={SIZE_PLACEHOLDER}
              onChange={(v) => {
                setCableSize(v);
                setOtherCableSize("");
              }}
              disabled={
                busy ||
                cableType === TYPE_PLACEHOLDER ||
                (cableType !== OTHERS && cableSizes.length === 0)
              }
            />
            {cableSize === OTHERS ? (
              <div className="mp-field__extra-row">
                <input
                  className="mp-field__extra"
                  value={otherCableSize}
                  onChange={(e) => setOtherCableSize(e.target.value)}
                  placeholder="Enter other cable size"
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !otherCableSize.trim()}
                  onClick={() => void addOtherSize()}
                >
                  Add to list
                </Button>
              </div>
            ) : null}
            {canRemoveSize ? (
              <button
                type="button"
                className="mp-field__remove"
                disabled={busy}
                onClick={() => void removeSelectedSize()}
              >
                Remove from this machine
              </button>
            ) : null}
          </div>

          <div className="mp-form__row">
            <label className="mp-field">
              <span>Planned production</span>
              <DecimalInput
                value={planned}
                onChange={setPlanned}
                disabled={busy}
              />
            </label>
            <label className="mp-field">
              <span>Actual production</span>
              <DecimalInput
                value={actual}
                onChange={setActual}
                disabled={busy}
              />
            </label>
          </div>

          <label className="mp-field">
            <span>Efficiency %</span>
            <input value={efficiency.toFixed(2)} readOnly />
          </label>

          <div className="mp-form__row">
            <label className="mp-field">
              <span>Operators</span>
              <input
                type="number"
                min={0}
                step={1}
                value={operators}
                onChange={(e) => setOperators(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="mp-field">
              <span>Helpers</span>
              <input
                type="number"
                min={0}
                step={1}
                value={helpers}
                onChange={(e) => setHelpers(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <label className="mp-field">
            <span>Total manpower</span>
            <input value={String(totalManpower)} readOnly />
          </label>

          <label className="mp-field">
            <span>Date & time</span>
            <input value={dateTimeLabel} readOnly />
          </label>

          <label className="mp-field">
            <span>Remarks</span>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={busy}
            />
          </label>

          {!readOnly ? (
            <LivePhotoUpload urls={photoUrls} onChange={setPhotoUrls} />
          ) : null}

          {!readOnly ? (
            <div className="mp-form__actions">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {saving ? "Saving…" : "Submit"}
              </Button>
            </div>
          ) : null}
        </form>
      ) : null}
    </SlideOver>
  );
}
