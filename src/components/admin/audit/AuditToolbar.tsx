"use client";

import { useEffect, useRef, useState } from "react";

type AuditToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  actorFilter: string;
  onActorFilterChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  actors: string[];
  activeFilterCount: number;
  onClearFilters: () => void;
  onExport: () => void;
};

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function AuditToolbar({
  query,
  onQueryChange,
  actorFilter,
  onActorFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  actors,
  activeFilterCount,
  onClearFilters,
  onExport,
}: AuditToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onDoc(e: MouseEvent) {
      if (!filterRef.current?.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  return (
    <div className="audit-toolbar">
      <label className="audit-toolbar__search">
        <span className="audit-sr-only">Search audit</span>
        <span className="audit-toolbar__search-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search actor, entity, field…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      <div className="audit-toolbar__spacer" aria-hidden />

      <div className="audit-toolbar__actions">
        <div className="audit-filter" ref={filterRef}>
          <button
            type="button"
            className={`audit-icon-btn ${activeFilterCount > 0 ? "is-active" : ""}`}
            onClick={() => setFilterOpen((v) => !v)}
            title="Filter"
            aria-label="Filter by date and user"
            aria-expanded={filterOpen}
          >
            <FilterIcon />
            {activeFilterCount > 0 ? (
              <span className="audit-icon-btn__badge">{activeFilterCount}</span>
            ) : null}
          </button>

          {filterOpen ? (
            <div className="audit-filter__menu" role="dialog" aria-label="Audit filters">
              <div className="audit-filter__field">
                <label htmlFor="audit-actor">User</label>
                <select
                  id="audit-actor"
                  value={actorFilter}
                  onChange={(e) => onActorFilterChange(e.target.value)}
                >
                  <option value="ALL">All users</option>
                  {actors.map((actor) => (
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>
              </div>
              <div className="audit-filter__field">
                <label htmlFor="audit-from">From date</label>
                <input
                  id="audit-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                />
              </div>
              <div className="audit-filter__field">
                <label htmlFor="audit-to">To date</label>
                <input
                  id="audit-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => onDateToChange(e.target.value)}
                />
              </div>
              <div className="audit-filter__actions">
                <button type="button" className="audit-filter__clear" onClick={onClearFilters}>
                  Clear
                </button>
                <button
                  type="button"
                  className="audit-filter__apply"
                  onClick={() => setFilterOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="audit-icon-btn"
          onClick={onExport}
          title="Export audit CSV"
          aria-label="Export audit CSV"
        >
          <ExportIcon />
        </button>
      </div>
    </div>
  );
}
