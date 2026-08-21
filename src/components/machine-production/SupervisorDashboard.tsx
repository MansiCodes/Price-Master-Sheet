"use client";

import { useCallback, useEffect, useState } from "react";
import { PageToolbar } from "@/components/ui/PageToolbar";
import {
  ProductionEntryForm,
  type MachineCard,
  type SlotInfo,
} from "@/components/machine-production/ProductionEntryForm";
import type { ShiftFilter } from "@/lib/machine-production/slots";

type DashboardPayload = {
  ok: boolean;
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  counts: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  machines: MachineCard[];
  error?: string;
};

const SHIFT_TABS: { id: ShiftFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DAY", label: "Day (9AM–9PM)" },
  { id: "NIGHT", label: "Night (9PM–9AM)" },
];

function statusClass(status: MachineCard["status"]) {
  if (status === "COMPLETED") return "mp-status--ok";
  if (status === "OVERDUE") return "mp-status--overdue";
  return "mp-status--pending";
}

/** Tints the whole card so a submitted slot is readable at a glance across the grid. */
function cardStatusClass(status: MachineCard["status"]) {
  if (status === "COMPLETED") return "mp-machine-card--ok";
  if (status === "OVERDUE") return "mp-machine-card--overdue";
  return "mp-machine-card--pending";
}

export function SupervisorDashboard({
  isAdmin,
}: {
  isAdmin: boolean;
}) {
  const [shift, setShift] = useState<ShiftFilter>("ALL");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MachineCard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/machine-production/dashboard?shift=${shift}`,
      );
      const json = (await res.json()) as DashboardPayload;
      if (!res.ok) {
        setError(json.error ?? "Failed to load dashboard");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [shift]);

  useEffect(() => {
    void load();
  }, [load]);

  const viewSlot = data?.viewSlot ?? null;

  return (
    <div className="mp-root">
      <PageToolbar
        title="Machine Production"
        subtitle="Submit production every 4 hours per machine"
        action={
          isAdmin ? (
            <a className="btn btn-secondary" href="/machine-production/admin">
              Admin dashboard
            </a>
          ) : undefined
        }
      />

      <div className="mp-shift-tabs" role="tablist" aria-label="Shift">
        {SHIFT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={shift === tab.id}
            className={
              shift === tab.id ? "mp-shift-tab mp-shift-tab--active" : "mp-shift-tab"
            }
            onClick={() => setShift(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewSlot ? (
        <div className="mp-slot-banner">
          <div>
            <p className="mp-slot-banner__label">Current slot</p>
            <p className="mp-slot-banner__value">
              {viewSlot.shift === "DAY" ? "Day" : "Night"} · {viewSlot.slotLabel}
            </p>
          </div>
          <div>
            <p className="mp-slot-banner__label">Deadline</p>
            <p className="mp-slot-banner__value">{viewSlot.deadlineLabel}</p>
          </div>
          <div>
            <p className="mp-slot-banner__label">Date</p>
            <p className="mp-slot-banner__value">{viewSlot.entryDate}</p>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="mp-counts">
          <span className="mp-count">Total {data.counts.total}</span>
          <span className="mp-count mp-count--ok">
            Completed {data.counts.completed}
          </span>
          <span className="mp-count mp-count--pending">
            Pending {data.counts.pending}
          </span>
          <span className="mp-count mp-count--overdue">
            Overdue {data.counts.overdue}
          </span>
        </div>
      ) : null}

      {loading ? <p className="mp-muted">Loading machines…</p> : null}
      {error ? <p className="mp-error">{error}</p> : null}

      {!loading && data ? (
        <div className="mp-machine-grid">
          {data.machines.length === 0 ? (
            <p className="mp-muted">
              No active machines. Ask an Admin to add machines.
            </p>
          ) : (
            data.machines.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mp-machine-card ${cardStatusClass(m.status)}`}
                onClick={() => setSelected(m)}
              >
                <div className="mp-machine-card__top">
                  <span className="mp-machine-card__code">{m.code}</span>
                  <span className={`mp-status ${statusClass(m.status)}`}>
                    {m.status}
                  </span>
                </div>
                <h2 className="mp-machine-card__name">{m.name}</h2>
                {m.description ? (
                  <p className="mp-machine-card__desc">{m.description}</p>
                ) : null}
                {m.status === "COMPLETED" ? (
                  <p className="mp-machine-card__meta">
                    Actual {m.actualProduction ?? "—"} · Eff{" "}
                    {m.efficiencyPct != null ? `${m.efficiencyPct}%` : "—"}
                  </p>
                ) : (
                  <p className="mp-machine-card__cta">Open production form →</p>
                )}
              </button>
            ))
          )}
        </div>
      ) : null}

      <ProductionEntryForm
        open={Boolean(selected)}
        machine={selected}
        viewSlot={viewSlot}
        onClose={() => setSelected(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
