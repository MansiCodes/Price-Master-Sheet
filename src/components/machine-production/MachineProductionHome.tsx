"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KpiCard } from "@/components/dashboard/KpiKra";
import type { MpHomeMetrics } from "@/lib/machine-production/home-metrics";
import "@/components/dashboard/dashboard.css";
import "@/components/today/today-hub.css";
import "@/components/machine-production/machine-production.css";

type ShiftKey = "DAY" | "NIGHT";

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function MachineProductionHome({
  metrics,
  embedded = false,
}: {
  metrics: MpHomeMetrics;
  embedded?: boolean;
}) {
  const liveShift = metrics.currentSlot.shift as ShiftKey;
  const [shift, setShift] = useState<ShiftKey>(liveShift);

  const processes = metrics.processesByShift[shift];
  const doneCount = processes.filter((p) => p.filled).length;
  const slotHint = `${metrics.currentSlot.shift === "DAY" ? "Day" : "Night"} · ${metrics.currentSlot.slotLabel}`;

  const completionPct = useMemo(() => {
    if (metrics.counts.total <= 0) return "0%";
    return `${Math.round((metrics.counts.completed / metrics.counts.total) * 100)}%`;
  }, [metrics.counts]);

  return (
    <div
      className={
        embedded
          ? "mp-home mp-home--embedded"
          : "dashboard mis dash-merged mp-home"
      }
    >
      <section className="mis-kpi-grid mis-kpi-grid--six" aria-label="Slot metrics">
        <KpiCard
          label="Machines"
          value={String(metrics.counts.total)}
          tone="teal"
          hint={`${slotHint} · current slot`}
          icon="production"
        />
        <KpiCard
          label="Completed"
          value={String(metrics.counts.completed)}
          tone="teal"
          hint="Submitted this slot"
          icon="profit"
        />
        <KpiCard
          label="Pending"
          value={String(metrics.counts.pending)}
          tone="amber"
          hint="Still open"
          icon="manpower"
        />
        <KpiCard
          label="Overdue"
          value={String(metrics.counts.overdue)}
          tone="coral"
          hint={`Deadline ${metrics.currentSlot.deadlineLabel}`}
          icon="expenses"
        />
        <KpiCard
          label="Slot fill"
          value={completionPct}
          tone="teal"
          hint="Completed / total machines"
          icon="stock"
        />
        <KpiCard
          label="Avg efficiency"
          value={
            metrics.avgEfficiencyPct != null
              ? `${metrics.avgEfficiencyPct}%`
              : "—"
          }
          tone="teal"
          hint={
            metrics.actualProductionSum > 0
              ? `Actual ${metrics.actualProductionSum.toLocaleString("en-IN")}`
              : "No submissions yet"
          }
          icon="sales"
        />
      </section>

      <div className="dash-merged__body">
        <div className="dash-merged__today">
          <section className="today-hub today-hub--embedded">
            <div className="today-card">
              <div className="today-card__head">
                <div className="today-card__head-main">
                  <h2 className="today-card__title">Current slot</h2>
                  <span className="today-card__progress">
                    {doneCount}/{processes.length || 0}
                  </span>
                </div>
                <div
                  className="shift-toggle today-card__shift-toggle"
                  role="group"
                  aria-label="Shift"
                >
                  <button
                    type="button"
                    className={shift === "DAY" ? "is-active" : ""}
                    onClick={() => setShift("DAY")}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    className={shift === "NIGHT" ? "is-active" : ""}
                    onClick={() => setShift("NIGHT")}
                  >
                    Night
                  </button>
                </div>
              </div>

              <ul className="today-checklist">
                {processes.length === 0 ? (
                  <li>
                    <span className="today-check today-check--empty">
                      <span className="today-check__label">No processes yet</span>
                    </span>
                  </li>
                ) : (
                  processes.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/machine-production?processId=${encodeURIComponent(p.id)}`}
                        className={`today-check${p.filled ? " today-check--done" : ""}`}
                      >
                        <span className="today-check__icon today-check__icon--teal">
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
                            <path d="M3 21V10l6-4v4l6-4v15M15 21V12l6 3v6M3 21h18" />
                          </svg>
                        </span>
                        <span className="today-check__label">{p.name}</span>
                        <span className="today-check__score">
                          {p.done}/{p.total}
                        </span>
                        <span className="today-check__mark" aria-hidden />
                      </Link>
                    </li>
                  ))
                )}
              </ul>

              <Link href="/machine-production" className="today-card__all">
                Open Machine Production →
              </Link>
            </div>
          </section>
        </div>

        <div className="dash-merged__side">
          <section className="mis-panel">
            <h2 className="section-label">This week</h2>
            <ul className="mis-day-list">
              {metrics.dailyReportRows.map((row) => (
                <li
                  key={row.date}
                  className={`mis-day-row${row.allComplete ? " is-done" : ""}`}
                >
                  <span className="mis-day-row__date">{formatDay(row.date)}</span>
                  <span className="mis-day-row__score">
                    <span className="mis-day-row__shift">
                      D{row.dayShift.completed}/{row.dayShift.total}
                      <span
                        className={`mis-day-row__dot${row.dayShift.allComplete ? " is-filled" : ""}`}
                        aria-hidden
                      />
                    </span>
                    <span className="mis-day-row__sep">·</span>
                    <span className="mis-day-row__shift">
                      N{row.nightShift.completed}/{row.nightShift.total}
                      <span
                        className={`mis-day-row__dot${row.nightShift.allComplete ? " is-filled" : ""}`}
                        aria-hidden
                      />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
