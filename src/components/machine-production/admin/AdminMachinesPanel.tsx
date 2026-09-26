"use client";

import { Button } from "@/components/ui/Button";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { TablePageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import { Pagination } from "@/components/ui/Pagination";
import type { MachineRow } from "@/components/machine-production/admin-dashboard-model";

type Props = {
  machineForm: { name: string };
  setMachineForm: (form: { name: string }) => void;
  editingId: string | null;
  machineSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  machinesTableLoading: boolean;
  machinesTable: MachineRow[];
  machinesPage: number;
  machinesPageSize: number;
  machinesTotal: number;
  setMachinesPage: (page: number) => void;
  setMachinesPageSize: (size: number) => void;
  onEdit: (machine: MachineRow) => void;
  onDelete: (id: string) => void;
  onToggle: (machine: MachineRow) => void;
};

export function AdminMachinesPanel({
  machineForm,
  setMachineForm,
  editingId,
  machineSaving,
  onSave,
  onReset,
  machinesTableLoading,
  machinesTable,
  machinesPage,
  machinesPageSize,
  machinesTotal,
  setMachinesPage,
  setMachinesPageSize,
  onEdit,
  onDelete,
  onToggle,
}: Props) {
  return (
    <div className="mp-admin-machines mp-admin-machines--full">
      <form
        className="mp-inline-form mp-inline-form--machine"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        {editingId ? (
          <h2 className="mp-inline-form__title">Edit machine</h2>
        ) : null}
        <label className="mp-inline-form__field">
          Name
          <input
            required
            value={machineForm.name}
            onChange={(e) => setMachineForm({ name: e.target.value })}
            placeholder="e.g. 100MM"
          />
        </label>
        <div className="mp-inline-form__actions">
          {editingId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={machineSaving}
            >
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={machineSaving}>
            {machineSaving ? (
              "Saving…"
            ) : editingId ? (
              "Save"
            ) : (
              <>
                <span className="mp-btn-label mp-btn-label--full">
                  Add machine
                </span>
                <span className="mp-btn-label mp-btn-label--short">Add</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {machinesTableLoading ? (
        <TablePageLoadingSkeleton
          rows={6}
          label="Loading machines"
          showChrome={false}
        />
      ) : (
        <>
          <div className="mp-table-wrap mp-table-wrap--full">
            <table className="mp-table mp-table--admin">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {machinesTable.map((m) => (
                  <tr key={m.id}>
                    <td>{m.code}</td>
                    <td>
                      {m.name}
                      {m.description ? (
                        <div className="mp-muted">{m.description}</div>
                      ) : null}
                    </td>
                    <td>
                      <label
                        className="mp-toggle"
                        title={m.isActive ? "Active" : "Inactive"}
                      >
                        <input
                          type="checkbox"
                          className="mp-toggle__input"
                          checked={m.isActive}
                          onChange={() => onToggle(m)}
                        />
                        <span className="mp-toggle__track" aria-hidden="true" />
                      </label>
                    </td>
                    <td className="mp-table__actions">
                      <ReportRowActions
                        onEdit={() => onEdit(m)}
                        onDelete={() => onDelete(m.id)}
                      />
                    </td>
                  </tr>
                ))}
                {machinesTable.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="mp-muted">
                      No machines yet. Add one using the form above.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            page={machinesPage}
            pageSize={machinesPageSize}
            total={machinesTotal}
            onPageChange={setMachinesPage}
            onPageSizeChange={(nextSize) => {
              setMachinesPageSize(nextSize);
              setMachinesPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
