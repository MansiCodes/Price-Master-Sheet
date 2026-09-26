"use client";

import { useEffect, useMemo, useState } from "react";
import "./price-sheet-share.css";
import { ShareAddContactForm } from "./share/ShareAddContactForm";
import {
  ShareBulkBar,
  ShareModalFooter,
  ShareViewAllBar,
} from "./share/SharePreview";
import { ShareRecipientList } from "./share/ShareRecipientList";
import {
  clearSelection,
  loadSavedRecipients,
  onAddNumber,
  onShare,
  removeSaved,
  selectAll,
  toggleSaved,
} from "./share/share-send-handlers";
import type { SavedRecipient, ShareModalProps } from "./share/types";
import { PREVIEW_LIMIT } from "./share/types";

export function PriceSheetShareModal({
  open,
  selectedRows,
  onClose,
  onShared,
}: ShareModalProps) {
  const [saved, setSaved] = useState<SavedRecipient[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(() => new Set());
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelectedPhones(new Set());
    setNewName("");
    setNewPhone("");
    setError(null);
    setSuccess(null);
    setSending(false);
    setViewAll(false);
    setLoadingSaved(true);

    void (async () => {
      try {
        const result = await loadSavedRecipients();
        if (result.error) {
          setError(result.error);
          setSaved([]);
          return;
        }
        setSaved(result.rows);
      } finally {
        setLoadingSaved(false);
      }
    })();
  }, [open]);

  const hasMoreThanPreview = saved.length > PREVIEW_LIMIT;
  const previewRows = useMemo(
    () => (viewAll || !hasMoreThanPreview ? saved : saved.slice(0, PREVIEW_LIMIT)),
    [saved, viewAll, hasMoreThanPreview],
  );
  const selectedCount = selectedPhones.size;

  if (!open) return null;

  return (
    <div className="ps-share-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`ps-share-modal${viewAll ? " ps-share-modal--view-all" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ps-share-head">
          <h2 id="ps-share-title">{viewAll ? "Select contacts" : "Share PDF"}</h2>
          <button
            type="button"
            className="ps-share-close"
            onClick={() => {
              if (viewAll) {
                setViewAll(false);
                return;
              }
              onClose();
            }}
            aria-label={viewAll ? "Back" : "Close"}
          >
            {viewAll ? "‹" : "×"}
          </button>
        </header>

        {error ? <div className="ps-share-alert ps-share-alert--error">{error}</div> : null}
        {success ? <div className="ps-share-alert ps-share-alert--ok">{success}</div> : null}

        {!viewAll ? (
          <ShareAddContactForm
            newName={newName}
            newPhone={newPhone}
            sending={sending}
            onNewNameChange={setNewName}
            onNewPhoneChange={setNewPhone}
            onSubmit={(e) =>
              onAddNumber(
                e,
                newName,
                newPhone,
                setError,
                setSelectedPhones,
                setSaved,
                setNewName,
                setNewPhone,
              )
            }
          />
        ) : (
          <ShareBulkBar
            selectedCount={selectedCount}
            savedLength={saved.length}
            sending={sending}
            onSelectAll={() => selectAll(setSelectedPhones, saved)}
            onClear={() => clearSelection(setSelectedPhones)}
          />
        )}

        <ShareRecipientList
          loadingSaved={loadingSaved}
          saved={saved}
          previewRows={previewRows}
          selectedPhones={selectedPhones}
          sending={sending}
          viewAll={viewAll}
          onToggle={(phone) => toggleSaved(setSelectedPhones, phone)}
          onRemove={(id, phone) => void removeSaved(id, phone, setSelectedPhones, setSaved)}
        />

        {!viewAll && hasMoreThanPreview ? (
          <ShareViewAllBar
            savedLength={saved.length}
            selectedCount={selectedCount}
            sending={sending}
            onViewAll={() => setViewAll(true)}
          />
        ) : null}

        <ShareModalFooter
          viewAll={viewAll}
          sending={sending}
          selectedRowsLength={selectedRows.length}
          selectedPhonesSize={selectedPhones.size}
          selectedCount={selectedCount}
          onDone={() => setViewAll(false)}
          onClose={onClose}
          onShare={() =>
            void onShare({
              selectedRows,
              selectedPhones,
              saved,
              setSending,
              setError,
              setSuccess,
              setSaved,
              onShared,
              onClose,
            })
          }
        />
      </div>
    </div>
  );
}
