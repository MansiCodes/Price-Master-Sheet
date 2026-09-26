"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MachineCard } from "@/components/machine-production/ProductionEntryForm";
import { CardGridLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import type { ShiftFilter } from "@/lib/machine-production/slots";
import { SupervisorEntryOverlay } from "@/components/machine-production/supervisor/SupervisorEntryOverlay";
import { SupervisorMachineGrid } from "@/components/machine-production/supervisor/SupervisorMachineGrid";
import { SupervisorProcessGrid } from "@/components/machine-production/supervisor/SupervisorProcessGrid";
import { SupervisorShiftTabs } from "@/components/machine-production/supervisor/SupervisorShiftTabs";
import type { DashboardPayload } from "@/components/machine-production/supervisor/supervisor-types";

export type { ProcessCard } from "@/components/machine-production/supervisor/supervisor-types";

export function SupervisorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processFromUrl = searchParams.get("processId");

  const [shift, setShift] = useState<ShiftFilter>("ALL");
  const [processId, setProcessId] = useState<string | null>(processFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
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
      ) : null}

      <div className="mp-toolbar">
        <div className="mp-toolbar__left">
          <SupervisorShiftTabs shift={shift} onShiftChange={setShift} />
        </div>

        {viewSlot ? (
          <div className="mp-slot-banner">
            <div>
              <p className="mp-slot-banner__label">Current slot</p>
              <p className="mp-slot-banner__value">
                {viewSlot.shift === "DAY" ? "Day" : "Night"} ·{" "}
                {viewSlot.slotLabel}
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
      </div>

      <div className="mp-board">
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

          <div className="mp-search-box">
            <svg
              className="mp-search-icon"
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="mp-search-input"
              placeholder="Search process or machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                className="mp-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <CardGridLoadingSkeleton
          cards={8}
          label="Loading machine production"
          showChrome={false}
        />
      ) : null}
      {error ? <p className="mp-error">{error}</p> : null}

      {!loading && data?.level === "processes" ? (
        <SupervisorProcessGrid
          processes={data.processes}
          searchQuery={searchQuery}
          onSelectProcess={selectProcess}
        />
      ) : null}

      {!loading && data?.level === "machines" ? (
        <SupervisorMachineGrid
          machines={data.machines}
          processName={data.process.name}
          onSelectMachine={setSelected}
        />
      ) : null}
      </div>

      <SupervisorEntryOverlay
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
