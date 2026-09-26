"use client";

import { FormEvent } from "react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { AdminCableSizeSection } from "@/components/machine-production/admin/AdminCableSizeSection";
import { AdminCableTypeSection } from "@/components/machine-production/admin/AdminCableTypeSection";
import type {
  CableSizeRow,
  CableTypeRow,
  MachineRow,
  ProcessRow,
} from "@/components/machine-production/admin-dashboard-model";

type Props = {
  processes: ProcessRow[];
  cableProcessId: string;
  setCableProcessId: (id: string) => void;
  cableMachineId: string;
  setCableMachineId: (id: string) => void;
  cableMachinesForProcess: MachineRow[];
  cableMachineHint?: string;
  cableTypeHint?: string;
  cableSizeHint?: string;
  editingCableTypeId: string | null;
  setEditingCableTypeId: (id: string | null) => void;
  cableTypeForm: { name: string };
  setCableTypeForm: (form: { name: string }) => void;
  saveCableType: (e: FormEvent) => void;
  addOthersCableType: () => void;
  cableTypes: CableTypeRow[];
  selectedCableTypeId: string;
  setSelectedCableTypeId: (id: string) => void;
  setPendingToggleCableType: (next: {
    type: CableTypeRow;
    nextActive: boolean;
  }) => void;
  editingCableSizeId: string | null;
  setEditingCableSizeId: (id: string | null) => void;
  cableSizeForm: { name: string };
  setCableSizeForm: (form: { name: string }) => void;
  saveCableSize: (e: FormEvent) => void;
  addOthersCableSize: () => void;
  cableSizes: CableSizeRow[];
  setPendingToggleCableSize: (next: {
    size: CableSizeRow;
    nextActive: boolean;
  }) => void;
  onDeleteType: (id: string) => void;
  onDeleteSize: (id: string) => void;
};

export function AdminCablePanel({
  processes,
  cableProcessId,
  setCableProcessId,
  cableMachineId,
  setCableMachineId,
  cableMachinesForProcess,
  cableMachineHint,
  cableTypeHint,
  cableSizeHint,
  editingCableTypeId,
  setEditingCableTypeId,
  cableTypeForm,
  setCableTypeForm,
  saveCableType,
  addOthersCableType,
  cableTypes,
  selectedCableTypeId,
  setSelectedCableTypeId,
  setPendingToggleCableType,
  editingCableSizeId,
  setEditingCableSizeId,
  cableSizeForm,
  setCableSizeForm,
  saveCableSize,
  addOthersCableSize,
  cableSizes,
  setPendingToggleCableSize,
  onDeleteType,
  onDeleteSize,
}: Props) {
  return (
    <div className="mp-cable-admin">
      <div className="mp-inline-form mp-inline-form--cable-scope">
        <h2 className="mp-inline-form__title">Process &amp; machine</h2>
        <div className="mp-inline-form__row mp-inline-form__row--cable-scope">
          <label className="mp-inline-form__field" htmlFor="cable-process">
            Process
            <SelectMenu
              id="cable-process"
              value={cableProcessId}
              placeholder="Select process"
              items={processes
                .filter((p) => p.isActive)
                .map((p) => ({ value: p.id, label: p.name }))}
              onChange={(next) => {
                setCableProcessId(next);
                setEditingCableTypeId(null);
                setEditingCableSizeId(null);
                setCableTypeForm({ name: "" });
                setCableSizeForm({ name: "" });
              }}
            />
          </label>
          <label className="mp-inline-form__field" htmlFor="cable-machine">
            Machine
            <span
              className={cableMachineHint ? "mp-disabled-hint" : undefined}
              data-hint={cableMachineHint}
            >
              <SelectMenu
                id="cable-machine"
                value={cableMachineId}
                placeholder="Select machine"
                disabled={!cableProcessId}
                searchable
                searchPlaceholder="Search machines…"
                items={cableMachinesForProcess.map((m) => ({
                  value: m.id,
                  label: m.name,
                  searchText: m.code,
                }))}
                onChange={(next) => {
                  setCableMachineId(next);
                  setEditingCableTypeId(null);
                  setEditingCableSizeId(null);
                  setCableTypeForm({ name: "" });
                  setCableSizeForm({ name: "" });
                }}
              />
            </span>
          </label>
        </div>
      </div>

      <AdminCableTypeSection
        cableProcessId={cableProcessId}
        cableMachineId={cableMachineId}
        cableTypeHint={cableTypeHint}
        editingCableTypeId={editingCableTypeId}
        cableTypeForm={cableTypeForm}
        setCableTypeForm={setCableTypeForm}
        onCancelEdit={() => {
          setEditingCableTypeId(null);
          setCableTypeForm({ name: "" });
        }}
        onSave={saveCableType}
        onAddOthers={addOthersCableType}
        cableTypes={cableTypes}
        selectedCableTypeId={selectedCableTypeId}
        onSelectType={(id) => {
          setSelectedCableTypeId(id);
          setEditingCableSizeId(null);
          setCableSizeForm({ name: "" });
        }}
        onToggle={(t) =>
          setPendingToggleCableType({ type: t, nextActive: !t.isActive })
        }
        onEdit={(t) => {
          setEditingCableTypeId(t.id);
          setCableTypeForm({ name: t.name });
        }}
        onDelete={onDeleteType}
      />

      <AdminCableSizeSection
        selectedCableTypeId={selectedCableTypeId}
        cableTypes={cableTypes}
        cableSizeHint={cableSizeHint}
        editingCableSizeId={editingCableSizeId}
        cableSizeForm={cableSizeForm}
        setCableSizeForm={setCableSizeForm}
        onCancelEdit={() => {
          setEditingCableSizeId(null);
          setCableSizeForm({ name: "" });
        }}
        onSave={saveCableSize}
        onAddOthers={addOthersCableSize}
        cableSizes={cableSizes}
        onToggle={(s) =>
          setPendingToggleCableSize({ size: s, nextActive: !s.isActive })
        }
        onEdit={(s) => {
          setEditingCableSizeId(s.id);
          setCableSizeForm({ name: s.name });
        }}
        onDelete={onDeleteSize}
      />
    </div>
  );
}
