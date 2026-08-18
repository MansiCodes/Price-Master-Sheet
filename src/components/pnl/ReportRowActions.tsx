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
      <button type="button" className="pnl-row-actions__edit" onClick={onEdit} disabled={disabled}>
        Edit
      </button>
      <button
        type="button"
        className="pnl-row-actions__delete"
        onClick={onDelete}
        disabled={disabled}
      >
        Delete
      </button>
    </div>
  );
}
