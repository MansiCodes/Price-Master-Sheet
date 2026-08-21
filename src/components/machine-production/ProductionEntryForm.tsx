"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LivePhotoUpload } from "@/components/machine-production/LivePhotoUpload";
import { Button } from "@/components/ui/Button";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { SlideOver } from "@/components/ui/SlideOver";
import { postJson } from "@/lib/client-forms";

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

type Props = {
  open: boolean;
  machine: MachineCard | null;
  viewSlot: SlotInfo | null;
  /** Process the supervisor drilled into — the entry is filed against it. */
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
  const [cableTypeRows, setCableTypeRows] = useState<
    { id: string; name: string }[]
  >([]);
  const [cableTypes, setCableTypes] = useState<string[]>([]);
  const [cableSizes, setCableSizes] = useState<string[]>([]);
  const [cableType, setCableType] = useState(TYPE_PLACEHOLDER);
  const [cableSize, setCableSize] = useState(SIZE_PLACEHOLDER);
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [operators, setOperators] = useState("1");
  const [helpers, setHelpers] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCableType(TYPE_PLACEHOLDER);
    setCableSize(SIZE_PLACEHOLDER);
    setCableSizes([]);
    setPlanned("");
    setActual("");
    setOperators("1");
    setHelpers("0");
    setRemarks("");
    setPhotoUrls([]);

    void (async () => {
      try {
        const typesRes = await fetch("/api/machine-production/cable-types");
        const typesJson = (await typesRes.json()) as {
          types?: { id: string; name: string }[];
          error?: string;
        };
        if (!typesRes.ok) {
          toast.error(typesJson.error ?? "Failed to load cable types");
          setCableTypes([]);
        } else {
          setCableTypes((typesJson.types ?? []).map((t) => t.name));
          setCableTypeRows(typesJson.types ?? []);
        }
      } catch {
        toast.error("Failed to load cable types");
        setCableTypes([]);
        setCableTypeRows([]);
      }
    })();
  }, [open, machine?.id]);

  useEffect(() => {
    if (!open) return;
    setCableSize(SIZE_PLACEHOLDER);
    setCableSizes([]);

    const typeRow = cableTypeRows.find((t) => t.name === cableType);
    if (!typeRow || cableType === TYPE_PLACEHOLDER) return;

    void (async () => {
      try {
        const res = await fetch(
          `/api/machine-production/cable-sizes?cableTypeId=${encodeURIComponent(typeRow.id)}`,
        );
        const json = (await res.json()) as {
          sizes?: { name: string }[];
          error?: string;
        };
        if (!res.ok) {
          toast.error(json.error ?? "Failed to load cable sizes");
          setCableSizes([]);
          return;
        }
        setCableSizes((json.sizes ?? []).map((s) => s.name));
      } catch {
        toast.error("Failed to load cable sizes");
        setCableSizes([]);
      }
    })();
  }, [open, cableType, cableTypeRows]);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machine || !viewSlot || readOnly) return;
    if (!processName) {
      toast.error("Open a process first, then pick a machine inside it");
      return;
    }
    if (
      !cableType ||
      cableType === TYPE_PLACEHOLDER ||
      !cableTypes.includes(cableType)
    ) {
      toast.error("Select a cable type");
      return;
    }
    if (
      !cableSize ||
      cableSize === SIZE_PLACEHOLDER ||
      !cableSizes.includes(cableSize)
    ) {
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
        cableType,
        cableSize,
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

          <label className="mp-field">
            <span>Cable type</span>
            <SelectMenu
              value={cableType}
              options={typeOptions}
              placeholder={TYPE_PLACEHOLDER}
              onChange={(v) => {
                setCableType(v);
                setCableSize(SIZE_PLACEHOLDER);
              }}
              disabled={readOnly || saving || cableTypes.length === 0}
            />
            {cableTypes.length === 0 ? (
              <span className="mp-muted">
                No cable types yet. Ask Admin to add them.
              </span>
            ) : null}
          </label>

          <label className="mp-field">
            <span>Cable size</span>
            <SelectMenu
              value={cableSize}
              options={sizeOptions}
              placeholder={SIZE_PLACEHOLDER}
              onChange={setCableSize}
              disabled={
                readOnly ||
                saving ||
                cableType === TYPE_PLACEHOLDER ||
                cableSizes.length === 0
              }
            />
            {cableType !== TYPE_PLACEHOLDER && cableSizes.length === 0 ? (
              <span className="mp-muted">
                No sizes for this cable type yet. Ask Admin to add them.
              </span>
            ) : null}
          </label>

          <div className="mp-form__row">
            <label className="mp-field">
              <span>Planned production</span>
              <DecimalInput
                value={planned}
                onChange={setPlanned}
                disabled={readOnly || saving}
              />
            </label>
            <label className="mp-field">
              <span>Actual production</span>
              <DecimalInput
                value={actual}
                onChange={setActual}
                disabled={readOnly || saving}
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
                disabled={readOnly || saving}
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
                disabled={readOnly || saving}
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
              disabled={readOnly || saving}
            />
          </label>

          {!readOnly ? (
            <LivePhotoUpload urls={photoUrls} onChange={setPhotoUrls} />
          ) : null}

          <div className="mp-form__actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            {!readOnly ? (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Submit production"}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </SlideOver>
  );
}
