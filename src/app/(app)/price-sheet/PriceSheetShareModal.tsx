"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { CableRate } from "@/lib/sheets/types";
import { indianMobileDigits, toIndiaPhoneE164 } from "@/lib/phone";
import "./price-sheet-share.css";

type Recipient = {
  id: string;
  phone: string;
  label: string | null;
};

type ShareModalProps = {
  open: boolean;
  selectedRows: CableRate[];
  onClose: () => void;
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

export function PriceSheetShareModal({
  open,
  selectedRows,
  onClose,
}: ShareModalProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch("/api/price-sheet/recipients");
      const json = (await res.json()) as { rows?: Recipient[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load recipients");
      setRecipients(json.rows ?? []);
      setSelectedPhones(new Set((json.rows ?? []).map((r) => r.phone)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipients");
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    void loadRecipients();
  }, [open, loadRecipients]);

  const selectedCount = selectedRows.length;
  const selectedPhoneList = useMemo(
    () => [...selectedPhones],
    [selectedPhones],
  );

  function togglePhone(phone: string) {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  async function onAddRecipient(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const e164 = toIndiaPhoneE164(newPhone);
    if (!e164) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const res = await fetch("/api/price-sheet/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: e164,
          label: newLabel.trim() || null,
        }),
      });
      const json = (await res.json()) as { row?: Recipient; error?: string };
      if (!res.ok || !json.row) {
        throw new Error(json.error || "Could not save number");
      }
      setRecipients((prev) => {
        const without = prev.filter((r) => r.phone !== json.row!.phone);
        return [json.row!, ...without];
      });
      setSelectedPhones((prev) => new Set(prev).add(json.row!.phone));
      setNewPhone("");
      setNewLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save number");
    }
  }

  async function onRemoveRecipient(id: string, phone: string) {
    await fetch(`/api/price-sheet/recipients?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      next.delete(phone);
      return next;
    });
  }

  async function onShare() {
    if (selectedCount === 0) {
      setError("Select at least one cable row to share.");
      return;
    }
    if (selectedPhoneList.length === 0) {
      setError("Select or add at least one WhatsApp number.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/price-sheet/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phones: selectedPhoneList,
          rows: selectedRows,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        sent?: number;
        failed?: number;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Share failed");
      }
      setSuccess(
        `Sent to ${json.sent ?? 0} recipient(s)${json.failed ? ` (${json.failed} failed)` : ""}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="ps-share-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ps-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ps-share-head">
          <div>
            <h2 id="ps-share-title">Share price sheet</h2>
            <p>
              {selectedCount} cable{selectedCount === 1 ? "" : "s"} selected
            </p>
          </div>
          <button type="button" className="ps-share-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {error ? <div className="ps-share-alert ps-share-alert--error">{error}</div> : null}
        {success ? <div className="ps-share-alert ps-share-alert--ok">{success}</div> : null}

        <section className="ps-share-section">
          <h3>WhatsApp recipients</h3>
          <p className="ps-share-hint">
            Add numbers below. They are saved for next time. Select who should receive this share.
          </p>

          <form className="ps-share-add" onSubmit={onAddRecipient}>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Mobile number"
              value={newPhone}
              onChange={(e) => setNewPhone(indianMobileDigits(e.target.value))}
              maxLength={10}
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <button type="submit" className="ps-btn ps-btn-secondary">
              Add
            </button>
          </form>

          <div className="ps-share-list" aria-busy={loadingRecipients}>
            {loadingRecipients ? (
              <p className="ps-share-empty">Loading numbers…</p>
            ) : recipients.length === 0 ? (
              <p className="ps-share-empty">No saved numbers yet. Add one above.</p>
            ) : (
              recipients.map((r) => (
                <label key={r.id} className="ps-share-recipient">
                  <input
                    type="checkbox"
                    checked={selectedPhones.has(r.phone)}
                    onChange={() => togglePhone(r.phone)}
                  />
                  <span className="ps-share-recipient__meta">
                    <strong>{r.label || r.phone}</strong>
                    {r.label ? <span>{r.phone}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="ps-share-recipient__remove"
                    aria-label="Remove saved number"
                    onClick={() => void onRemoveRecipient(r.id, r.phone)}
                  >
                    Remove
                  </button>
                </label>
              ))
            )}
          </div>
        </section>

        <footer className="ps-share-foot">
          <button type="button" className="ps-btn ps-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ps-btn ps-btn-primary"
            disabled={sending || selectedCount === 0 || selectedPhoneList.length === 0}
            onClick={() => void onShare()}
          >
            <ShareIcon />
            {sending ? "Sending…" : "Send on WhatsApp"}
          </button>
        </footer>
      </div>
    </div>
  );
}
