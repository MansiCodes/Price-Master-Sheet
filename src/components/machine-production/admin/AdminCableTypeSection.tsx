"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import type { CableTypeRow } from "@/components/machine-production/admin-dashboard-model";

type Props = {
  cableProcessId: string;
  cableMachineId: string;
  cableTypeHint?: string;
  editingCableTypeId: string | null;
  cableTypeForm: { name: string };
  setCableTypeForm: (form: { name: string }) => void;
  onCancelEdit: () => void;
  onSave: (e: FormEvent) => void;
  onAddOthers: () => void;
  cableTypes: CableTypeRow[];
  selectedCableTypeId: string;
  onSelectType: (id: string) => void;
  onToggle: (type: CableTypeRow) => void;
  onEdit: (type: CableTypeRow) => void;
  onDelete: (id: string) => void;
};

export function AdminCableTypeSection({
  cableProcessId,
  cableMachineId,
  cableTypeHint,
  editingCableTypeId,
  cableTypeForm,
  setCableTypeForm,
  onCancelEdit,
  onSave,
  onAddOthers,
  cableTypes,
  selectedCableTypeId,
  onSelectType,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  return (
    <>
      <form
        className="mp-inline-form mp-inline-form--machine mp-cable-panel mp-cable-panel--form"
        onSubmit={(e) => void onSave(e)}
      >
        <h2 className="mp-inline-form__title">
          {editingCableTypeId ? "Edit cable type" : "Add cable type"}
        </h2>
        <p
          className="mp-muted mp-inline-form__hint mp-inline-form__hint--inline mp-cable-form-hint"
          aria-hidden={!cableProcessId || !cableMachineId}
        >
          {cableProcessId && cableMachineId
            ? "Types for the selected process + machine"
            : "\u00a0"}
        </p>
        <label
          className={`mp-inline-form__field${cableTypeHint ? " mp-disabled-hint" : ""}`}
          data-hint={cableTypeHint}
        >
            <span className="mp-inline-form__label">Name</span>
            <input
              required
              value={cableTypeForm.name}
              onChange={(e) => setCableTypeForm({ name: e.target.value })}
              placeholder="e.g. Signalling Cable"
              disabled={!cableProcessId || !cableMachineId}
            />
          </label>
          <div className="mp-inline-form__actions">
            {editingCableTypeId ? (
              <Button type="button" variant="ghost" onClick={onCancelEdit}>
                Cancel
              </Button>
            ) : null}
            <span
              className={cableTypeHint ? "mp-disabled-hint" : undefined}
              data-hint={cableTypeHint}
            >
              <Button
                type="button"
                variant="secondary"
                disabled={!cableProcessId || !cableMachineId}
                onClick={() => void onAddOthers()}
              >
                Add Others
              </Button>
            </span>
            <span
              className={cableTypeHint ? "mp-disabled-hint" : undefined}
              data-hint={cableTypeHint}
            >
              <Button
                type="submit"
                disabled={!cableProcessId || !cableMachineId}
              >
                {editingCableTypeId ? "Save" : "Add type"}
              </Button>
            </span>
          </div>
      </form>

      <div className="mp-table-wrap mp-cable-panel mp-cable-panel--table">
        <table className="mp-table">
          <thead>
            <tr>
              <th>Cable type</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!cableProcessId || !cableMachineId ? (
              <tr>
                <td colSpan={3} className="mp-muted">
                  Select process and machine above.
                </td>
              </tr>
            ) : (
              cableTypes.map((t) => (
                <tr
                  key={t.id}
                  className={
                    selectedCableTypeId === t.id
                      ? "mp-table__row mp-table__row--selected"
                      : "mp-table__row"
                  }
                  onClick={() => onSelectType(t.id)}
                >
                  <td>{t.name}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <label
                      className="mp-toggle"
                      title={t.isActive ? "Active" : "Inactive"}
                    >
                      <input
                        type="checkbox"
                        className="mp-toggle__input"
                        checked={t.isActive}
                        onChange={() => onToggle(t)}
                      />
                      <span className="mp-toggle__track" aria-hidden="true" />
                    </label>
                  </td>
                  <td
                    className="mp-table__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ReportRowActions
                      onEdit={() => onEdit(t)}
                      onDelete={() => onDelete(t.id)}
                    />
                  </td>
                </tr>
              ))
            )}
            {cableProcessId && cableMachineId && cableTypes.length === 0 ? (
              <tr>
                <td colSpan={3} className="mp-muted">
                  No cable types linked yet for this process + machine.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
