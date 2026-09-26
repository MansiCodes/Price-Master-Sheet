"use client";

import { fromStoredIndiaPhone } from "@/lib/phone";
import type { SavedRecipient } from "./types";

type ShareRecipientListProps = {
  loadingSaved: boolean;
  saved: SavedRecipient[];
  previewRows: SavedRecipient[];
  selectedPhones: Set<string>;
  sending: boolean;
  viewAll: boolean;
  onToggle: (phone: string) => void;
  onRemove: (id: string, phone: string) => void;
};

export function ShareRecipientList({
  loadingSaved,
  saved,
  previewRows,
  selectedPhones,
  sending,
  viewAll,
  onToggle,
  onRemove,
}: ShareRecipientListProps) {
  return (
    <div
      className={`ps-share-list${viewAll ? " ps-share-list--all" : ""}`}
      aria-label="Contacts"
    >
      {loadingSaved ? (
        <p className="ps-share-empty">Loading…</p>
      ) : saved.length === 0 ? (
        <p className="ps-share-empty">Add name + number</p>
      ) : (
        previewRows.map((row) => {
          const checked = selectedPhones.has(row.phone);
          const phoneLabel = fromStoredIndiaPhone(row.phone);
          return (
            <div
              key={row.id}
              className={`ps-share-recipient${checked ? " is-selected" : ""}`}
            >
              <label className="ps-share-recipient__main">
                <input
                  type="checkbox"
                  className="ps-row-check"
                  checked={checked}
                  disabled={sending}
                  onChange={() => onToggle(row.phone)}
                />
                <span className="ps-share-recipient__text">
                  <span className="ps-share-recipient__name">
                    {row.label?.trim() || "—"}
                  </span>
                  <span className="ps-share-recipient__phone">{phoneLabel}</span>
                </span>
              </label>
              {!viewAll ? (
                <button
                  type="button"
                  className="ps-share-recipient__remove"
                  disabled={sending}
                  aria-label={`Remove ${phoneLabel}`}
                  onClick={() => void onRemove(row.id, row.phone)}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
