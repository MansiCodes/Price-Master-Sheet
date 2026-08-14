"use client";

import { useEffect, useRef, useState } from "react";
import { ROLE_LABEL, ROLES } from "./types";

type UsersToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  onAddUser: () => void;
  onExport: () => void;
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

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

export function UsersToolbar({
  query,
  onQueryChange,
  roleFilter,
  onRoleFilterChange,
  onAddUser,
  onExport,
}: UsersToolbarProps) {
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
    <div className="users-toolbar">
      <label className="users-toolbar__search">
        <span className="users-sr-only">Search users</span>
        <span className="users-toolbar__search-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      <div className="users-toolbar__spacer" aria-hidden />

      <div className="users-toolbar__actions">
        <button
          type="button"
          className="users-icon-btn users-icon-btn--primary"
          onClick={onAddUser}
          title="Add user"
          aria-label="Add user"
        >
          <PlusIcon />
        </button>

        <div className="users-filter" ref={filterRef}>
          <button
            type="button"
            className={`users-icon-btn ${roleFilter !== "ALL" ? "is-active" : ""}`}
            onClick={() => setFilterOpen((v) => !v)}
            title="Filter by role"
            aria-label="Filter by role"
            aria-expanded={filterOpen}
          >
            <FilterIcon />
          </button>
          {filterOpen ? (
            <div className="users-filter__menu" role="listbox" aria-label="Role filter">
              <button
                type="button"
                className={roleFilter === "ALL" ? "is-selected" : ""}
                onClick={() => {
                  onRoleFilterChange("ALL");
                  setFilterOpen(false);
                }}
              >
                All roles
              </button>
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={roleFilter === r ? "is-selected" : ""}
                  onClick={() => {
                    onRoleFilterChange(r);
                    setFilterOpen(false);
                  }}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="users-icon-btn"
          onClick={onExport}
          title="Export users"
          aria-label="Export users"
        >
          <ExportIcon />
        </button>
      </div>
    </div>
  );
}
