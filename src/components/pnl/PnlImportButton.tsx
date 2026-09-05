"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

type ImportSummary = {
  batchId: string;
  uploadedAt: string;
  sales: number;
  purchases: number;
  stock: number;
  expenses: number;
  electricity: number;
  rent: number;
  far: number;
  skipped: { sheet: string; row: number; reason: string }[];
};

function formatUploadTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PnlImportButton({
  plantId,
  canImport = false,
  salesPurchaseOnly = false,
  onImported,
}: {
  plantId: string;
  canImport?: boolean;
  /** Accountants: only Sales + Purchase sheets are imported. */
  salesPurchaseOnly?: boolean;
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/plants/${plantId}/import/pnl`, {
        method: "POST",
        body,
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        summary?: ImportSummary;
        skipped?: ImportSummary["skipped"];
      } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Import failed");
      }
      const s = json?.summary;
      if (s) {
        const parts = [
          s.sales ? `${s.sales} sales` : null,
          s.purchases ? `${s.purchases} purchases` : null,
          !salesPurchaseOnly && s.stock ? `${s.stock} stock` : null,
          !salesPurchaseOnly && s.expenses ? `${s.expenses} expenses` : null,
          !salesPurchaseOnly && s.electricity
            ? `${s.electricity} electricity`
            : null,
          !salesPurchaseOnly && s.rent ? `${s.rent} rent` : null,
          !salesPurchaseOnly && s.far ? `${s.far} FAR` : null,
        ].filter(Boolean);
        toast.success(
          `Imported ${parts.join(", ") || "0 rows"} · upload ${formatUploadTime(s.uploadedAt)}`,
        );
        if (s.skipped.length > 0) {
          toast.message(
            `${s.skipped.length} row(s) skipped — check headers / required columns`,
          );
        }
      } else {
        toast.success("Import complete");
      }
      onImported?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!canImport) return null;

  return (
    <>
      <button
        type="button"
        className="pnl-export-btn pnl-export-btn--compact pnl-import-btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={
          salesPurchaseOnly
            ? "Import Sales and Purchase from Excel"
            : "Import Sales, Purchase, Stock, Expense from one Excel file"
        }
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5" />
          <path d="M12 18v-6M9 15l3-3 3 3" />
        </svg>
        <span className="pnl-export-btn__label">
          {busy ? "Importing…" : "Import Excel"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </>
  );
}
