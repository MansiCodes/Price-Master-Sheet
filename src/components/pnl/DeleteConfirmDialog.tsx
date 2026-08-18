"use client";

import { useEffect } from "react";

export function DeleteConfirmDialog({
  open,
  deleting,
  onYes,
  onNo,
}: {
  open: boolean;
  deleting?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) onNo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onNo]);

  if (!open) return null;

  return (
    <div className="pnl-delete-dialog" role="presentation">
      <button
        type="button"
        className="pnl-delete-dialog__backdrop"
        aria-label="No"
        disabled={deleting}
        onClick={onNo}
      />
      <div
        className="pnl-delete-dialog__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pnl-delete-title"
        aria-describedby="pnl-delete-copy"
      >
        <h2 id="pnl-delete-title" className="pnl-delete-dialog__title">
          Delete data?
        </h2>
        <p id="pnl-delete-copy" className="pnl-delete-dialog__copy">
          Are you sure you want to delete the data? This cannot be undone.
        </p>
        <div className="pnl-delete-dialog__actions">
          <button
            type="button"
            className="pnl-delete-dialog__no"
            onClick={onNo}
            disabled={deleting}
          >
            No
          </button>
          <button
            type="button"
            className="pnl-delete-dialog__yes"
            onClick={onYes}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}
