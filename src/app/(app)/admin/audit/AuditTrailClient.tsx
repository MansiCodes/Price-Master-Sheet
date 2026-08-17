"use client";

import { useCallback, useEffect, useState } from "react";
import { AuditTable } from "@/components/admin/audit/AuditTable";
import {
  AuditTableSkeleton,
  AuditToolbarSkeleton,
} from "@/components/admin/audit/AuditSkeleton";
import { AuditToolbar } from "@/components/admin/audit/AuditToolbar";
import {
  AUDIT_PAGE_SIZE,
  type AuditRow,
} from "@/components/admin/audit/types";
import "@/components/admin/audit/audit.css";

type AuditPageResponse = {
  rows: AuditRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  actors: string[];
};

export function AuditTrailClient() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [actors, setActors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(
    async (nextPage: number, forExport = false) => {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(forExport ? 50 : AUDIT_PAGE_SIZE),
      });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (actorFilter !== "ALL") params.set("actor", actorFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load audit trail");
      return (await res.json()) as AuditPageResponse;
    },
    [actorFilter, dateFrom, dateTo, debouncedQuery],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, actorFilter, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    void fetchPage(page)
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
        setPage(data.page);
        setActors(data.actors);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [actorFilter, dateFrom, dateTo, debouncedQuery, fetchPage, page]);

  const activeFilterCount =
    (actorFilter !== "ALL" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const hasFilters = activeFilterCount > 0 || query.trim().length > 0;

  function clearFilters() {
    setActorFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setQuery("");
  }

  async function exportCsv() {
    const collected: AuditRow[] = [];
    let nextPage = 1;
    let pages = 1;
    while (nextPage <= pages) {
      const data = await fetchPage(nextPage, true);
      collected.push(...data.rows);
      pages = data.totalPages;
      nextPage += 1;
      if (nextPage > 40) break;
    }
    const csvRows = [
      ["When", "Actor", "Email", "Entity", "Field", "Backdated", "Change"],
      ...collected.map((r) => [
        r.createdAt,
        r.actorName,
        r.actorEmail,
        r.entityType,
        r.field ?? "",
        r.isBackdated ? "Yes" : "No",
        r.newValue ?? "",
      ]),
    ];
    const csv = csvRows
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
        onExport={() => void exportCsv()}
      />

      {loading ? (
        <AuditTableSkeleton />
      ) : (
        <AuditTable
          rows={rows}
          page={page}
          pageSize={AUDIT_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
        />
      )}
    </div>
  );
}
