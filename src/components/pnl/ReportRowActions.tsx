"use client";

export function ReportRowActions({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="pnl-row-actions">
      <button type="button" className="pnl-row-actions__edit" onClick={onEdit} disabled={disabled} title="Edit">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </button>
      <button type="button" className="pnl-row-actions__delete" onClick={onDelete} disabled={disabled} title="Delete">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  );
}
