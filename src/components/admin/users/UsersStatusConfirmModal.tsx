"use client";

import type { UserRow } from "./types";

type UsersStatusConfirmModalProps = {
  confirmUser: UserRow;
  togglingId: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function UsersStatusConfirmModal({
  confirmUser,
  togglingId,
  onCancel,
  onConfirm,
}: UsersStatusConfirmModalProps) {
  return (
    <div className="users-modal is-open" role="presentation">
      <div
        className="users-modal__backdrop"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="users-modal__panel users-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="user-status-title"
        aria-describedby="user-status-copy"
      >
        <div className="users-modal__header">
          <h2 id="user-status-title" className="users-confirm__title">
            {confirmUser.isActive ? "Deactivate user?" : "Activate user?"}
          </h2>
          <button
            type="button"
            className="users-modal__close"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p id="user-status-copy" className="users-confirm__copy">
          Are you sure you want to{" "}
          {confirmUser.isActive ? "deactivate" : "activate"}{" "}
          <strong>{confirmUser.name || confirmUser.email}</strong>?
          {confirmUser.isActive
            ? " They will not be able to sign in until activated again."
            : " They will be able to sign in again."}
        </p>
        <div className="users-modal__footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={togglingId === confirmUser.id}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={togglingId === confirmUser.id}
          >
            {togglingId === confirmUser.id
              ? "Saving…"
              : confirmUser.isActive
                ? "Deactivate"
                : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}
