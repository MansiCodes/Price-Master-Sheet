"use client";

import { useState } from "react";
import { EntryApproveRejectGroup } from "@/components/dashboard/EntryApproveRejectGroup";
import { localeToBcp47, type AppLocale } from "@/i18n/config";
import type { EntryApprovalKind } from "@/lib/entry-approval-types";

export type PendingEntryRow = {
  id: string;
  kind: EntryApprovalKind;
  plantId: string;
  date: string;
  shift: string;
  plantName: string;
  enteredByName: string | null;
  label: string;
  detail: string;
  amount: number;
};

const TABS: { key: EntryApprovalKind; label: string }[] = [
  { key: "purchase", label: "Purchase" },
  { key: "sale", label: "Sales" },
  { key: "stock", label: "Stock" },
  { key: "expense", label: "Expense" },
];

function formatDay(dateStr: string, locale: AppLocale): string {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString(localeToBcp47(locale), {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function EntryApprovalsPanel({
  entries,
  initialTab = "purchase",
  locale,
}: {
  entries: PendingEntryRow[];
  initialTab?: EntryApprovalKind;
  locale: AppLocale;
}) {
  const [tab, setTab] = useState<EntryApprovalKind>(initialTab);
  const filtered = entries.filter((e) => e.kind === tab);
  const counts = TABS.map((t) => ({
    ...t,
    count: entries.filter((e) => e.kind === t.key).length,
  }));

  return (
    <section className="mis-panel" style={{ marginTop: "1.5rem", padding: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {counts.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              border: tab === t.key ? "1px solid #0f766e" : "1px solid #e5e7eb",
              background: tab === t.key ? "#f0fdfa" : "#fff",
              color: tab === t.key ? "#0f766e" : "#374151",
              fontWeight: tab === t.key ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {t.label}
            {t.count > 0 ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mp-muted" style={{ margin: 0, textAlign: "center", padding: "2rem 0" }}>
          No pending {tab} entries.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            className="approvals-table"
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Date</th>
                <th style={{ padding: "0.5rem" }}>Shift</th>
                <th style={{ padding: "0.5rem" }}>Plant</th>
                <th style={{ padding: "0.5rem" }}>Entered by</th>
                <th style={{ padding: "0.5rem" }}>Details</th>
                <th style={{ padding: "0.5rem" }}>Amount</th>
                <th style={{ padding: "0.5rem", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {formatDay(row.date, locale)}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", textTransform: "capitalize" }}>
                    {row.shift.toLowerCase()}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>{row.plantName}</td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {row.enteredByName ?? "—"}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <div style={{ fontWeight: 500 }}>{row.label}</div>
                    {row.detail ? (
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        {row.detail}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {formatINR(row.amount)}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                    <EntryApproveRejectGroup entryId={row.id} kind={row.kind} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
