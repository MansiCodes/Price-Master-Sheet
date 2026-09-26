"use client";

import { Button } from "@/components/ui/Button";
import { MachineMultiSelect } from "@/components/machine-production/MachineMultiSelect";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { TablePageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import { Pagination } from "@/components/ui/Pagination";
import type {
  MachineRow,
  ProcessRow,
} from "@/components/machine-production/admin-dashboard-model";

type Props = {
  machines: MachineRow[];
  processForm: { name: string };
  setProcessForm: (form: { name: string }) => void;
  editingProcessId: string | null;
  processSaving: boolean;
  processMachineIds: string[];
  setProcessMachineIds: (ids: string[]) => void;
  onSave: () => void;
  onReset: () => void;
  processesTableLoading: boolean;
  processesTable: ProcessRow[];
  processes: ProcessRow[];
  processesPage: number;
  processesPageSize: number;
  processesTotal: number;
  setProcessesPage: (page: number) => void;
  setProcessesPageSize: (size: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (process: ProcessRow) => void;
  onDelete: (id: string) => void;
  onToggle: (process: ProcessRow) => void;
};

export function AdminProcessesPanel({
  machines,
  processForm,
  setProcessForm,
  editingProcessId,
  processSaving,
  processMachineIds,
  setProcessMachineIds,
  onSave,
  onReset,
  processesTableLoading,
  processesTable,
  processes,
  processesPage,
  processesPageSize,
  processesTotal,
  setProcessesPage,
  setProcessesPageSize,
  onMove,
  onEdit,
  onDelete,
  onToggle,
}: Props) {
  return (
    <div className="mp-admin-machines mp-admin-machines--full">
      <form
        className="mp-inline-form mp-inline-form--process"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        {editingProcessId ? (
          <h2 className="mp-inline-form__title">Edit process</h2>
        ) : null}
        <div className="mp-inline-form__row mp-inline-form__row--actions">
          <label className="mp-inline-form__field mp-inline-form__field--name">
            Process name
            <input
              required
              value={processForm.name}
              onChange={(e) => setProcessForm({ name: e.target.value })}
              placeholder="e.g. Aluminium Stranding"
            />
          </label>
          <div className="mp-inline-form__field mp-inline-form__field--machines">
            Machines ({processMachineIds.length})
            <MachineMultiSelect
              machines={machines}
              value={processMachineIds}
              onChange={setProcessMachineIds}
              placeholder="Select machines…"
              searchPlaceholder="Search machines…"
            />
          </div>
          <div className="mp-inline-form__actions">
            {editingProcessId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                disabled={processSaving}
              >
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={processSaving}>
              {processSaving
                ? "Saving…"
                : editingProcessId
                  ? "Save"
                  : "Add"}
            </Button>
          </div>
        </div>
      </form>

      {processesTableLoading ? (
        <TablePageLoadingSkeleton
          rows={6}
          label="Loading processes"
          showChrome={false}
        />
      ) : (
        <>
          <div className="mp-table-wrap mp-table-wrap--full">
            <table className="mp-table mp-table--admin mp-table--processes">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Process</th>
                  <th>Machines</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processesTable.map((p, i) => {
                  const globalIndex =
                    (processesPage - 1) * processesPageSize + i;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="mp-reorder">
                          <span className="mp-reorder__num">
                            {globalIndex + 1}
                          </span>
                          <button
                            type="button"
                            className="mp-reorder__btn"
                            aria-label={`Move ${p.name} up`}
                            disabled={globalIndex === 0}
                            onClick={() => void onMove(globalIndex, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="mp-reorder__btn"
                            aria-label={`Move ${p.name} down`}
                            disabled={globalIndex >= processes.length - 1}
                            onClick={() => void onMove(globalIndex, 1)}
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                      <td>{p.name}</td>
                      <td>{p.machineCount}</td>
                      <td>
                        <label
                          className="mp-toggle"
                          title={p.isActive ? "Active" : "Inactive"}
                        >
                          <input
                            type="checkbox"
                            className="mp-toggle__input"
                            checked={p.isActive}
                            onChange={() => onToggle(p)}
                          />
                          <span
                            className="mp-toggle__track"
                            aria-hidden="true"
                          />
                        </label>
                      </td>
                      <td className="mp-table__actions">
                        <ReportRowActions
                          onEdit={() => onEdit(p)}
                          onDelete={() => onDelete(p.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {processesTable.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="mp-muted">
                      No processes yet. Add one using the form above.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            page={processesPage}
            pageSize={processesPageSize}
            total={processesTotal}
            onPageChange={setProcessesPage}
            onPageSizeChange={(nextSize) => {
              setProcessesPageSize(nextSize);
              setProcessesPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
