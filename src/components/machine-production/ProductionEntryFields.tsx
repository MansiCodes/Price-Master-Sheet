"use client";

import { LivePhotoUpload } from "@/components/machine-production/LivePhotoUpload";
import type { ProductionCableCatalog } from "@/components/machine-production/useProductionCableCatalog";
import type { MachineCard } from "@/components/machine-production/production-entry-types";
import {
  OTHERS,
  SIZE_PLACEHOLDER,
  TYPE_PLACEHOLDER,
} from "@/components/machine-production/production-entry-types";
import { Button } from "@/components/ui/Button";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { todayLocalISO } from "@/lib/client-forms";

export type ProductionEntryFieldState = {
  planned: string;
  setPlanned: (v: string) => void;
  actual: string;
  setActual: (v: string) => void;
  coilNo: string;
  setCoilNo: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  operatorName: string;
  setOperatorName: (v: string) => void;
  operators: string;
  setOperators: (v: string) => void;
  helpers: string;
  setHelpers: (v: string) => void;
  remarks: string;
  setRemarks: (v: string) => void;
  photoUrls: string[];
  setPhotoUrls: (urls: string[]) => void;
  entryDate: string;
  setEntryDate: (v: string) => void;
  efficiency: number;
  totalManpower: number;
  hasPriorEntries: boolean;
  busy: boolean;
  saving: boolean;
  readOnly: boolean;
};

type Props = {
  machine: MachineCard;
  processName: string | null;
  catalog: ProductionCableCatalog;
  fields: ProductionEntryFieldState;
  onClose: () => void;
};

export function ProductionEntryFields({
  machine,
  processName,
  catalog: c,
  fields: f,
  onClose,
}: Props) {
  return (
    <>
      {f.hasPriorEntries ? (
        <p className="mp-form__banner mp-form__banner--ok">
          {machine.entryCount} entr
          {machine.entryCount === 1 ? "y" : "ies"} already saved for this
          slot — submit to add another.
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
          value={c.cableType}
          options={c.typeOptions}
          placeholder={TYPE_PLACEHOLDER}
          onChange={(v) => {
            c.setCableType(v);
            c.setCableSize(SIZE_PLACEHOLDER);
            c.setOtherCableType("");
            c.setOtherCableSize("");
          }}
          disabled={f.busy || c.cableTypes.length === 0}
        />
        {c.cableType === OTHERS ? (
          <div className="mp-field__extra-row">
            <input
              className="mp-field__extra"
              value={c.otherCableType}
              onChange={(e) => c.setOtherCableType(e.target.value)}
              placeholder="Enter other cable type"
              disabled={f.busy}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={f.busy || !c.otherCableType.trim()}
              onClick={() => void c.addOtherType()}
            >
              Add to list
            </Button>
          </div>
        ) : null}
        {c.canRemoveType ? (
          <button
            type="button"
            className="mp-field__remove"
            disabled={f.busy}
            onClick={() => void c.removeSelectedType()}
          >
            Remove from this machine
          </button>
        ) : null}
      </div>

      <div className="mp-field">
        <span>Cable size</span>
        <SelectMenu
          value={c.cableSize}
          options={c.sizeOptions}
          placeholder={SIZE_PLACEHOLDER}
          onChange={(v) => {
            c.setCableSize(v);
            c.setOtherCableSize("");
          }}
          disabled={
            f.busy ||
            c.cableType === TYPE_PLACEHOLDER ||
            (c.cableType !== OTHERS && c.cableSizes.length === 0)
          }
        />
        {c.cableSize === OTHERS ? (
          <div className="mp-field__extra-row">
            <input
              className="mp-field__extra"
              value={c.otherCableSize}
              onChange={(e) => c.setOtherCableSize(e.target.value)}
              placeholder="Enter other cable size"
              disabled={f.busy}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={f.busy || !c.otherCableSize.trim()}
              onClick={() => void c.addOtherSize()}
            >
              Add to list
            </Button>
          </div>
        ) : null}
        {c.canRemoveSize ? (
          <button
            type="button"
            className="mp-field__remove"
            disabled={f.busy}
            onClick={() => void c.removeSelectedSize()}
          >
            Remove from this machine
          </button>
        ) : null}
      </div>

      <div className="mp-form__row">
        <label className="mp-field">
          <span>Planned production</span>
          <DecimalInput value={f.planned} onChange={f.setPlanned} disabled={f.busy} />
        </label>
        <label className="mp-field">
          <span>Actual production</span>
          <DecimalInput value={f.actual} onChange={f.setActual} disabled={f.busy} />
        </label>
      </div>

      <div className="mp-form__row">
        <label className="mp-field">
          <span>Coil No.</span>
          <input
            type="text"
            value={f.coilNo}
            onChange={(e) => f.setCoilNo(e.target.value)}
            disabled={f.busy}
            placeholder="Enter coil number"
          />
        </label>
        <label className="mp-field">
          <span>Weight (kg)</span>
          <DecimalInput
            value={f.weight}
            onChange={f.setWeight}
            disabled={f.busy}
            placeholder="Enter weight"
          />
        </label>
      </div>

      <label className="mp-field">
        <span>Operator name</span>
        <input
          type="text"
          value={f.operatorName}
          onChange={(e) => f.setOperatorName(e.target.value)}
          disabled={f.busy}
          placeholder="Enter operator name"
          required
        />
      </label>

      <label className="mp-field">
        <span>Efficiency %</span>
        <input value={f.efficiency.toFixed(2)} readOnly />
      </label>

      <div className="mp-form__row">
        <label className="mp-field">
          <span>Operators</span>
          <input
            type="number"
            min={0}
            step={1}
            value={f.operators}
            onChange={(e) => f.setOperators(e.target.value)}
            disabled={f.busy}
          />
        </label>
        <label className="mp-field">
          <span>Helpers</span>
          <input
            type="number"
            min={0}
            step={1}
            value={f.helpers}
            onChange={(e) => f.setHelpers(e.target.value)}
            disabled={f.busy}
          />
        </label>
      </div>

      <label className="mp-field">
        <span>Total manpower</span>
        <input value={String(f.totalManpower)} readOnly />
      </label>

      <label className="mp-field">
        <span>Date</span>
        <input
          type="date"
          required
          max={todayLocalISO()}
          value={f.entryDate}
          onChange={(e) => f.setEntryDate(e.target.value)}
          disabled={f.busy}
        />
      </label>

      <label className="mp-field">
        <span>Remarks</span>
        <textarea
          rows={3}
          value={f.remarks}
          onChange={(e) => f.setRemarks(e.target.value)}
          disabled={f.busy}
        />
      </label>

      {!f.readOnly ? <LivePhotoUpload urls={f.photoUrls} onChange={f.setPhotoUrls} /> : null}

      {!f.readOnly ? (
        <div className="mp-form__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={f.busy}>
            {f.saving ? "Saving…" : "Submit"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
