"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductionEntryFields } from "@/components/machine-production/ProductionEntryFields";
import { useProductionCableCatalog } from "@/components/machine-production/useProductionCableCatalog";
import { SlideOver } from "@/components/ui/SlideOver";
import { postJson, todayLocalISO } from "@/lib/client-forms";
import type {
  MachineCard,
  SlotInfo,
} from "@/components/machine-production/production-entry-types";
import {
  OTHERS,
  SIZE_PLACEHOLDER,
  TYPE_PLACEHOLDER,
} from "@/components/machine-production/production-entry-types";

export type { MachineCard, SlotInfo } from "@/components/machine-production/production-entry-types";

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
  const catalog = useProductionCableCatalog(open, machine, processName, viewSlot);
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [operators, setOperators] = useState("1");
  const [helpers, setHelpers] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [coilNo, setCoilNo] = useState("");
  const [weight, setWeight] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [entryDate, setEntryDate] = useState("");

  useEffect(() => {
    if (!open || !machine?.id || !processName) return;
    setPlanned("");
    setActual("");
    setOperators("1");
    setHelpers("0");
    setRemarks("");
    setCoilNo("");
    setWeight("");
    setOperatorName("");
    setEntryDate(viewSlot?.entryDate ? viewSlot.entryDate.split("T")[0] : todayLocalISO());
    setPhotoUrls([]);
  }, [open, machine?.id, processName, viewSlot]);

  const plannedNum = Number(planned) || 0;
  const actualNum = Number(actual) || 0;
  const ops = Math.max(0, Math.floor(Number(operators) || 0));
  const helps = Math.max(0, Math.floor(Number(helpers) || 0));
  const totalManpower = ops + helps;
  const efficiency =
    plannedNum > 0 ? Math.round((actualNum / plannedNum) * 10000) / 100 : 0;

  const dateTimeLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
  }, [open]);

  const hasPriorEntries = (machine?.entryCount ?? 0) > 0;
  // Always allow another entry for the same slot, even after COMPLETED.
  const readOnly = false;
  const busy = readOnly || saving || catalog.catalogBusy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!machine || !viewSlot || readOnly) return;
    if (!processName) {
      toast.error("Open a process first, then pick a machine inside it");
      return;
    }

    let finalType = catalog.cableType;
    let finalSize = catalog.cableSize;

    if (!catalog.cableType || catalog.cableType === TYPE_PLACEHOLDER) {
      toast.error("Select a cable type");
      return;
    }
    if (catalog.cableType === OTHERS) {
      finalType = catalog.otherCableType.trim();
      if (!finalType) {
        toast.error("Enter the other cable type");
        return;
      }
    } else if (!catalog.cableTypes.includes(catalog.cableType)) {
      toast.error("Select a cable type");
      return;
    }

    if (!catalog.cableSize || catalog.cableSize === SIZE_PLACEHOLDER) {
      toast.error("Select a cable size");
      return;
    }
    if (catalog.cableSize === OTHERS) {
      finalSize = catalog.otherCableSize.trim();
      if (!finalSize) {
        toast.error("Enter the other cable size");
        return;
      }
    } else if (catalog.cableType === OTHERS) {
      finalSize =
        catalog.cableSize === OTHERS
          ? catalog.otherCableSize.trim()
          : catalog.cableSize;
      if (!finalSize) {
        toast.error("Select or enter a cable size");
        return;
      }
    } else if (!catalog.cableSizes.includes(catalog.cableSize)) {
      toast.error("Select a cable size");
      return;
    }

    if (plannedNum < 0 || actualNum < 0) {
      toast.error("Production values must be zero or more");
      return;
    }
    if (!operatorName.trim()) {
      toast.error("Enter operator name");
      return;
    }

    setSaving(true);
    const res = await postJson<{ ok: boolean; error?: string }>(
      "/api/machine-production/entries",
      {
        machineId: machine.id,
        entryDate,
        shift: viewSlot.shift,
        slotStartHour: viewSlot.slotStartHour,
        currentProcess: processName,
        cableType: finalType,
        cableSize: finalSize,
        plannedProduction: plannedNum,
        actualProduction: actualNum,
        operators: ops,
        helpers: helps,
        operatorName: operatorName.trim(),
        remarks: remarks.trim() || null,
        coilNo: coilNo.trim() || null,
        weight: weight ? Number(weight) : null,
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
          <ProductionEntryFields
            machine={machine}
            processName={processName}
            catalog={catalog}
            onClose={onClose}
            fields={{
              planned,
              setPlanned,
              actual,
              setActual,
              coilNo,
              setCoilNo,
              weight,
              setWeight,
              operatorName,
              setOperatorName,
              operators,
              setOperators,
              helpers,
              setHelpers,
              remarks,
              setRemarks,
              photoUrls,
              setPhotoUrls,
              entryDate,
              setEntryDate,
              efficiency,
              totalManpower,
              hasPriorEntries,
              busy,
              saving,
              readOnly,
            }}
          />
        </form>
      ) : null}
    </SlideOver>
  );
}
