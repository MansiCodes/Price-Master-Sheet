"use client";

import { useEffect, useMemo, useState } from "react";
import { AuditTable } from "@/components/admin/audit/AuditTable";
import {
  AuditTableSkeleton,
  AuditToolbarSkeleton,
} from "@/components/admin/audit/AuditSkeleton";
import { AuditToolbar } from "@/components/admin/audit/AuditToolbar";
import type { AuditRow } from "@/components/admin/audit/types";
import "@/components/admin/audit/audit.css";

type Props = {
  initialRows: AuditRow[];
};

export function AuditTrailClient({ initialRows }: Props) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [query, setQuery] = useState("");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const t = window.setTimeout(() => setBootstrapping(false), 450);
    return () => window.clearTimeout(t);
  }, []);

  const actors = useMemo(() => {
    const set = new Set(initialRows.map((r) => r.actorName));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [initialRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (actorFilter !== "ALL" && r.actorName !== actorFilter) return false;
      if (dateFrom && r.dateKey < dateFrom) return false;
      if (dateTo && r.dateKey > dateTo) return false;
      if (!q) return true;
      return (
        r.actorName.toLowerCase().includes(q) ||
        r.actorEmail.toLowerCase().includes(q) ||
        r.entityType.toLowerCase().includes(q) ||
        r.entityId.toLowerCase().includes(q) ||
        (r.field ?? "").toLowerCase().includes(q) ||
        (r.oldValue ?? "").toLowerCase().includes(q) ||
        (r.newValue ?? "").toLowerCase().includes(q)
      );
    });
  }, [initialRows, query, actorFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, actorFilter, dateFrom, dateTo]);

  const activeFilterCount =
    (actorFilter !== "ALL" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const hasFilters = activeFilterCount > 0 || query.trim().length > 0;

  function clearFilters() {
    setActorFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setQuery("");
  }

  function exportCsv() {
    const rows = [
      ["When", "Actor", "Email", "Entity", "Entity ID", "Field", "Backdated", "Old", "New"],
      ...filtered.map((r) => [
        r.createdAt,
        r.actorName,
        r.actorEmail,
        r.entityType,
        r.entityId,
        r.field ?? "",
        r.isBackdated ? "Yes" : "No",
        r.oldValue ?? "",
        r.newValue ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell);
            return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (bootstrapping) {
    return (
      <div className="audit-page">
        <AuditToolbarSkeleton />
        <AuditTableSkeleton />
      </div>
    );
  }

  return (
    <div className="audit-page">
      <AuditToolbar
        query={query}
        onQueryChange={setQuery}
        actorFilter={actorFilter}
        onActorFilterChange={setActorFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        actors={actors}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        onExport={exportCsv}
      />

      <AuditTable
        rows={paged}
        page={safePage}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
