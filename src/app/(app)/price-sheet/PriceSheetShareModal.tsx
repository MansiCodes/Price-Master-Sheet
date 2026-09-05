"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CableRate } from "@/lib/sheets/types";
import { fromStoredIndiaPhone, indianMobileDigits, toIndiaPhoneE164 } from "@/lib/phone";
import "./price-sheet-share.css";

type SavedRecipient = {
  id: string;
  phone: string;
  label: string | null;
};

type ShareModalProps = {
  open: boolean;
  selectedRows: CableRate[];
  onClose: () => void;
  onShared: () => void;
};

const PREVIEW_LIMIT = 3;

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
        const response = await fetch("/api/price-sheet/recipients");
        const payload = (await response.json()) as {
          rows?: SavedRecipient[];
          error?: string;
        };
        if (!response.ok) {
          setError(payload.error || "Could not load contacts.");
          setSaved([]);
          return;
        }
        setSaved(Array.isArray(payload.rows) ? payload.rows : []);
      } catch {
        setError("Could not load contacts.");
        setSaved([]);
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

  function toggleSaved(phone: string) {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  function selectAll() {
    setSelectedPhones(new Set(saved.map((row) => row.phone)));
  }

  function clearSelection() {
    setSelectedPhones(new Set());
  }

  function onAddNumber(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim() || "Customer";
    const e164 = toIndiaPhoneE164(newPhone);
    if (!e164) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setSelectedPhones((prev) => new Set(prev).add(e164));
    setSaved((prev) => {
      const existing = prev.find((row) => row.phone === e164);
      if (existing) {
        return prev.map((row) =>
          row.phone === e164 ? { ...row, label: name } : row,
        );
      }
      return [{ id: `new-${e164}`, phone: e164, label: name }, ...prev];
    });
    setNewName("");
    setNewPhone("");
  }

  async function removeSaved(id: string, phone: string) {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      next.delete(phone);
      return next;
    });
    setSaved((prev) => prev.filter((row) => row.id !== id));

    if (!id.startsWith("new-")) {
      await fetch(`/api/price-sheet/recipients?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).catch(() => null);
    }
  }

  async function onShare() {
    if (selectedRows.length === 0) {
      setError("Select at least one cable.");
      return;
    }
    if (selectedPhones.size === 0) {
      setError("Select a contact.");
      return;
    }

    const recipients = [...selectedPhones].map((phone) => {
      const row = saved.find((r) => r.phone === phone);
      return {
        phone,
        name: row?.label?.trim() || "Customer",
      };
    });

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/price-sheet/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          rows: selectedRows,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        sent?: number;
        failed?: number;
        results?: { phone: string; ok: boolean; message?: string }[];
      };

      if (!response.ok || !payload.ok) {
        const firstFail = payload.results?.find((r) => !r.ok)?.message;
        setError(
          firstFail ||
            payload.message ||
            "Could not send PDF. Check Integrations + Cloudinary.",
        );
        return;
      }

      const sent = payload.sent ?? recipients.length;
      const failed = payload.failed ?? 0;

      setSuccess(
        failed > 0
          ? `Sent to ${sent}, ${failed} failed.`
          : `Sent to ${sent}.`,
      );

      try {
        const savedRes = await fetch("/api/price-sheet/recipients");
        const savedPayload = (await savedRes.json()) as { rows?: SavedRecipient[] };
        if (savedRes.ok && Array.isArray(savedPayload.rows)) {
          setSaved(savedPayload.rows);
        }
      } catch {
        // ignore
      }

      window.setTimeout(() => {
        onShared();
        onClose();
      }, 1200);
    } catch {
      setError("Could not send PDF. Try again.");
    } finally {
      setSending(false);
    }
  }

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
          <form className="ps-share-add" onSubmit={onAddNumber}>
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
              disabled={sending}
              aria-label="Name"
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Number (e.g. 9876543210)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              maxLength={16}
              disabled={sending}
              aria-label="Mobile number"
            />
            <button type="submit" className="ps-btn ps-btn-secondary" disabled={sending}>
              Add
            </button>
          </form>
        ) : (
          <div className="ps-share-bulk">
            <p className="ps-share-bulk__hint">
              {selectedCount} of {saved.length} selected
            </p>
            <div className="ps-share-bulk__actions">
              <button
                type="button"
                className="ps-share-link-btn"
                disabled={sending || saved.length === 0}
                onClick={selectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="ps-share-link-btn"
                disabled={sending || selectedCount === 0}
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
                      onChange={() => toggleSaved(row.phone)}
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
                      onClick={() => void removeSaved(row.id, row.phone)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {!viewAll && hasMoreThanPreview ? (
          <div className="ps-share-view-all">
            <span className="ps-share-view-all__meta">
              Showing {PREVIEW_LIMIT} of {saved.length}
              {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
            </span>
            <button
              type="button"
              className="ps-share-link-btn"
              disabled={sending}
              onClick={() => setViewAll(true)}
            >
              View all
            </button>
          </div>
        ) : null}

        <footer className="ps-share-foot">
          {viewAll ? (
            <button
              type="button"
              className="ps-btn ps-btn-primary"
              disabled={sending}
              onClick={() => setViewAll(false)}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ps-btn ps-btn-ghost"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                disabled={selectedRows.length === 0 || selectedPhones.size === 0 || sending}
                onClick={() => void onShare()}
              >
                {sending
                  ? "Sending PDF…"
                  : selectedCount > 0
                    ? `Share PDF (${selectedCount})`
                    : "Share PDF"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
