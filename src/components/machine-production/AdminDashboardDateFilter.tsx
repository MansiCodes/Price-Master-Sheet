"use client";

import { useEffect, useRef, useState } from "react";
import type { Filters } from "@/components/machine-production/admin-dashboard-model";

type Props = {
  filters: Filters;
  todayYmd: string;
  onPatchFilters: (next: Filters | ((prev: Filters) => Filters)) => void;
};

export function AdminDashboardDateFilter({
  filters,
  todayYmd,
  onPatchFilters,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount = (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const root = rootRef.current;
      if (!root || !(e.target instanceof Node) || root.contains(e.target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="mp-filters__date-filter" ref={rootRef}>
      <button
        type="button"
        className={`mp-filters__icon-btn${activeCount > 0 ? " is-active" : ""}`}
        title="Filter dates"
        aria-label="Filter by from and to date"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <span className="mp-filters__icon-btn__text">Filter</span>
        {activeCount > 0 ? (
          <span className="mp-filters__icon-btn__badge">{activeCount}</span>
        ) : null}
      </button>
      {open ? (
        <div className="mp-date-filter__menu" role="dialog" aria-label="Date filters">
          <label className="mp-date-filter__field">
            From
            <input
              type="date"
              className="mp-date-pill"
              value={filters.dateFrom}
              max={filters.dateTo || todayYmd}
              onChange={(e) =>
                onPatchFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
          </label>
          <label className="mp-date-filter__field">
            To
            <input
              type="date"
              className="mp-date-pill"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              max={todayYmd}
              onChange={(e) =>
                onPatchFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className="mp-date-filter__done"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
