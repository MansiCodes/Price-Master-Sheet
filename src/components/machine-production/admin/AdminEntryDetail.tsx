"use client";

import {
  EntryEditDrawer,
} from "@/components/pnl/EntryEditDrawer";
import {
  ENTRY_EDIT_FIELDS,
  type EntryRow,
} from "@/components/machine-production/admin-dashboard-model";

type Props = {
  selected: EntryRow | null;
  onClose: () => void;
  onEdit: (entry: EntryRow) => void;
  onDelete: (id: string) => void;
  editingEntry: EntryRow | null;
  entryEditValues: Record<string, string>;
  entrySaving: boolean;
  entryEditError: string | null;
  onChangeField: (name: string, value: string) => void;
  onCloseEdit: () => void;
  onSaveEdit: () => void;
};

export function AdminEntryDetail({
  selected,
  onClose,
  onEdit,
  onDelete,
  editingEntry,
  entryEditValues,
  entrySaving,
  entryEditError,
  onChangeField,
  onCloseEdit,
  onSaveEdit,
}: Props) {
  return (
    <>
      {selected ? (
        <div className="mp-detail-backdrop" onClick={onClose}>
          <div
            className="mp-detail"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mp-detail__head">
              <h2>Production detail</h2>
              <div className="mp-detail__head-actions">
                <button
                  type="button"
                  className="mp-detail__icon-btn"
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => onEdit(selected)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="mp-detail__icon-btn mp-detail__icon-btn--danger"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => onDelete(selected.id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="mp-detail__icon-btn"
                  title="Close"
                  aria-label="Close"
                  onClick={onClose}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <dl className="mp-detail__grid">
              <div>
                <dt>Machine</dt>
                <dd>
                  {selected.machine?.name} ({selected.machine?.code})
                </dd>
              </div>
              <div>
                <dt>Operator name</dt>
                <dd>{selected.operatorName?.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{selected.entryDate}</dd>
              </div>
              <div>
                <dt>Shift</dt>
                <dd>{selected.shiftLabel}</dd>
              </div>
              <div>
                <dt>Slot</dt>
                <dd>{selected.slotLabel}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(selected.submittedAt).toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt>Current process</dt>
                <dd>{selected.currentProcess || "—"}</dd>
              </div>
              <div>
                <dt>Cable</dt>
                <dd>
                  {selected.cableType} / {selected.cableSize}
                </dd>
              </div>
              <div>
                <dt>Production</dt>
                <dd>
                  Planned {selected.plannedProduction} · Actual{" "}
                  {selected.actualProduction} · Eff {selected.efficiencyPct}%
                </dd>
              </div>
              <div>
                <dt>Manpower</dt>
                <dd>
                  Ops {selected.operators} · Helpers {selected.helpers} · Total{" "}
                  {selected.totalManpower}
                </dd>
              </div>
              <div>
                <dt>Remarks</dt>
                <dd>{selected.remarks || "—"}</dd>
              </div>
            </dl>
            {selected.photoUrls.length > 0 ? (
              <div className="mp-detail__photos">
                {selected.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Production photo" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mp-muted">No photos attached.</p>
            )}
          </div>
        </div>
      ) : null}

      <EntryEditDrawer
        open={Boolean(editingEntry)}
        title="Edit production entry"
        fields={ENTRY_EDIT_FIELDS}
        values={entryEditValues}
        saving={entrySaving}
        error={entryEditError}
        onChange={onChangeField}
        onClose={onCloseEdit}
        onSave={() => void onSaveEdit()}
      />
    </>
  );
}
