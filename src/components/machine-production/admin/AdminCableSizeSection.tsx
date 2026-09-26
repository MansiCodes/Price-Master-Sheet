"use client";

import { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import type {
  CableSizeRow,
  CableTypeRow,
} from "@/components/machine-production/admin-dashboard-model";

type Props = {
  selectedCableTypeId: string;
  cableTypes: CableTypeRow[];
  cableSizeHint?: string;
  editingCableSizeId: string | null;
  cableSizeForm: { name: string };
  setCableSizeForm: (form: { name: string }) => void;
  onCancelEdit: () => void;
  onSave: (e: FormEvent) => void;
  onAddOthers: () => void;
  cableSizes: CableSizeRow[];
  onToggle: (size: CableSizeRow) => void;
  onEdit: (size: CableSizeRow) => void;
  onDelete: (id: string) => void;
};

export function AdminCableSizeSection({
  selectedCableTypeId,
  cableTypes,
  cableSizeHint,
  editingCableSizeId,
  cableSizeForm,
  setCableSizeForm,
  onCancelEdit,
  onSave,
  onAddOthers,
  cableSizes,
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
          {editingCableSizeId ? "Edit cable size" : "Add cable size"}
        </h2>
        <p className="mp-muted mp-inline-form__hint mp-inline-form__hint--inline mp-cable-form-hint">
          {selectedCableTypeId
            ? `For type: ${
                cableTypes.find((t) => t.id === selectedCableTypeId)
                  ?.name ?? "—"
              }`
            : "Select a cable type on the left first."}
        </p>
        <label
          className={`mp-inline-form__field${cableSizeHint ? " mp-disabled-hint" : ""}`}
          data-hint={cableSizeHint}
        >
          <span className="mp-inline-form__label">Size name</span>
          <input
            required
            value={cableSizeForm.name}
            onChange={(e) => setCableSizeForm({ name: e.target.value })}
            placeholder="e.g. 2 Core x 2.5 sqmm"
            disabled={!selectedCableTypeId}
          />
        </label>
        <div className="mp-inline-form__actions">
          {editingCableSizeId ? (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
          <span
            className={cableSizeHint ? "mp-disabled-hint" : undefined}
            data-hint={cableSizeHint}
          >
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedCableTypeId}
              onClick={() => void onAddOthers()}
            >
              Add Others
            </Button>
          </span>
          <span
            className={cableSizeHint ? "mp-disabled-hint" : undefined}
            data-hint={cableSizeHint}
          >
            <Button type="submit" disabled={!selectedCableTypeId}>
              {editingCableSizeId ? "Save" : "Add size"}
            </Button>
          </span>
        </div>
      </form>

      <div className="mp-table-wrap mp-cable-panel mp-cable-panel--table">
        <table className="mp-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!selectedCableTypeId ? (
              <tr>
                <td colSpan={3} className="mp-muted">
                  Select a cable type to manage its sizes.
                </td>
              </tr>
            ) : (
              cableSizes.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <label
                      className="mp-toggle"
                      title={s.isActive ? "Active" : "Inactive"}
                    >
                      <input
                        type="checkbox"
                        className="mp-toggle__input"
                        checked={s.isActive}
                        onChange={() => onToggle(s)}
                      />
                      <span className="mp-toggle__track" aria-hidden="true" />
                    </label>
                  </td>
                  <td className="mp-table__actions">
                    <ReportRowActions
                      onEdit={() => onEdit(s)}
                      onDelete={() => onDelete(s.id)}
                    />
                  </td>
                </tr>
              ))
            )}
            {selectedCableTypeId && cableSizes.length === 0 ? (
              <tr>
                <td colSpan={3} className="mp-muted">
                  No sizes for this cable type yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
