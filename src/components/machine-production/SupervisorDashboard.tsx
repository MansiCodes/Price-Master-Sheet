"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProductionEntryForm,
  type MachineCard,
  type SlotInfo,
} from "@/components/machine-production/ProductionEntryForm";
import type { ShiftFilter, SlotStatus } from "@/lib/machine-production/slots";

type Counts = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
};

export type ProcessCard = {
  id: string;
  name: string;
  machineCount: number;
  completed: number;
  pending: number;
  overdue: number;
  status: SlotStatus;
};

type ProcessLevel = {
  ok: boolean;
  level: "processes";
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  counts: Counts;
  processes: ProcessCard[];
  error?: string;
};

type MachineLevel = {
  ok: boolean;
  level: "machines";
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  process: { id: string; name: string };
  counts: Counts;
  machines: MachineCard[];
  error?: string;
};

type DashboardPayload = ProcessLevel | MachineLevel;

const SHIFT_TABS: { id: ShiftFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DAY", label: "Day (9AM–9PM)" },
  { id: "NIGHT", label: "Night (9PM–9AM)" },
];

function statusClass(status: SlotStatus) {
  if (status === "COMPLETED") return "mp-status--ok";
  if (status === "OVERDUE") return "mp-status--overdue";
  return "mp-status--pending";
}

/** Tints the whole card so a submitted slot is readable at a glance across the grid. */
function cardStatusClass(status: SlotStatus) {
  if (status === "COMPLETED") return "mp-machine-card--ok";
  if (status === "OVERDUE") return "mp-machine-card--overdue";
  return "mp-machine-card--pending";
}

export function SupervisorDashboard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processFromUrl = searchParams.get("processId");

  const [shift, setShift] = useState<ShiftFilter>("ALL");
  const [processId, setProcessId] = useState<string | null>(processFromUrl);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MachineCard | null>(null);

  useEffect(() => {
    setProcessId(processFromUrl);
  }, [processFromUrl]);

  const selectProcess = useCallback(
    (id: string | null) => {
      setProcessId(id);
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("processId", id);
      else sp.delete("processId");
      const q = sp.toString();
      router.replace(q ? `/machine-production?${q}` : "/machine-production");
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ shift });
      if (processId) sp.set("processId", processId);
      const res = await fetch(`/api/machine-production/dashboard?${sp}`);
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
  }, [shift, processId]);

  useEffect(() => {
    void load();
  }, [load]);

  const viewSlot = data?.viewSlot ?? null;
  const inProcess = data?.level === "machines" ? data : null;

  return (
    <div className="mp-root">
      {isAdmin || inProcess ? (
        <div className="mp-top-row">
          {inProcess ? (
            <nav className="mp-breadcrumb" aria-label="Breadcrumb">
              <button
                type="button"
                className="mp-breadcrumb__back"
                onClick={() => selectProcess(null)}
              >
                ← All processes
              </button>
              <span className="mp-breadcrumb__sep">/</span>
              <span className="mp-breadcrumb__current">
                {inProcess.process.name}
              </span>
            </nav>
          ) : (
            <span />
          )}
          {isAdmin ? (
            <a className="btn btn-secondary" href="/machine-production/admin">
              Admin dashboard
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mp-shift-tabs" role="tablist" aria-label="Shift">
        {SHIFT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={shift === tab.id}
            className={
              shift === tab.id
                ? "mp-shift-tab mp-shift-tab--active"
                : "mp-shift-tab"
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

      {loading ? <p className="mp-muted">Loading…</p> : null}
      {error ? <p className="mp-error">{error}</p> : null}

      {!loading && data?.level === "processes" ? (
        <div className="mp-machine-grid">
          {data.processes.length === 0 ? (
            <p className="mp-muted">
              No processes yet. Ask an Admin to add processes and assign
              machines to them.
            </p>
          ) : (
            data.processes.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`mp-machine-card ${cardStatusClass(p.status)}`}
                onClick={() => selectProcess(p.id)}
              >
                <div className="mp-machine-card__top">
                  <span className="mp-machine-card__code">PROCESS</span>
                  <span className={`mp-status ${statusClass(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <h2 className="mp-machine-card__name">{p.name}</h2>
                <p className="mp-machine-card__meta">
                  {p.completed} of {p.machineCount} submitted
                  {p.overdue > 0 ? ` · ${p.overdue} overdue` : ""}
                </p>
                <p className="mp-machine-card__cta">View machines →</p>
              </button>
            ))
          )}
        </div>
      ) : null}

      {!loading && data?.level === "machines" ? (
        <div className="mp-machine-grid">
          {data.machines.length === 0 ? (
            <p className="mp-muted">
              No active machines in this process. Ask an Admin to assign
              machines to it.
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
        processName={inProcess?.process.name ?? null}
        onClose={() => setSelected(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
