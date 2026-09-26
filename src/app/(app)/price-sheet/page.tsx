"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CableRate } from "@/lib/sheets/types";
import { rateRowKey } from "@/lib/price-sheet-share";
import { PriceSheetShareModal } from "@/app/(app)/price-sheet/PriceSheetShareModal";
import { PriceSheetToolbar } from "@/app/(app)/price-sheet/PriceSheetToolbar";
import { PriceSheetTable } from "@/app/(app)/price-sheet/PriceSheetTable";
import { PriceSheetMobileList } from "@/app/(app)/price-sheet/PriceSheetMobileList";
import { PriceSheetPagination } from "@/app/(app)/price-sheet/PriceSheetPagination";
import {
  AUTO_SYNC_MS,
  buildPageList,
  downloadRatesCsv,
} from "@/app/(app)/price-sheet/price-sheet-utils";
import "./price-sheet.css";
import "./price-sheet-share.css";

export default function PriceSheetPage() {
  const [rates, setRates] = useState<CableRate[]>([]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkSelectValue, setBulkSelectValue] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const ratesCountRef = useRef(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rates;
    return rates.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        String(row.sNo ?? "").includes(q) ||
        String(row.specification || "").toLowerCase().includes(q) ||
        String(row.specificationFull || "").toLowerCase().includes(q),
    );
  }, [rates, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageList = buildPageList(totalPages, safePage, isCompact);

  const filteredKeys = useMemo(
    () => filtered.map((row) => rateRowKey(row)),
    [filtered],
  );

  const selectedRows = useMemo(
    () => filtered.filter((row) => selectedKeys.has(rateRowKey(row))),
    [filtered, selectedKeys],
  );

  function toggleRow(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedKeys(new Set());
  }

  function handleShareClick() {
    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }
    if (selectedRows.length === 0) {
      exitSelectionMode();
      return;
    }
    setShareOpen(true);
  }

  function selectAllFiltered() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of filteredKeys) next.add(key);
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of filteredKeys) next.delete(key);
      return next;
    });
  }

  function onSelectionMenuChange(value: string) {
    if (value === "Select All") {
      selectAllFiltered();
    } else if (value === "Deselect All") {
      deselectAllFiltered();
    }
    setBulkSelectValue("");
  }

  function handleShareComplete() {
    exitSelectionMode();
  }

  const shareButtonLabel =
    selectionMode && selectedRows.length > 0
      ? `Share (${selectedRows.length})`
      : "Share";
  const tableColSpan = selectionMode ? 9 : 8;

  const fetchRates = useCallback(async () => {
    const response = await fetch("/api/rates");
    const payload = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: CableRate[];
    };

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Failed to load rates");
    }

    const next = Array.isArray(payload.data) ? payload.data : [];
    ratesCountRef.current = next.length;
    setRates(next);
    setError(null);
  }, []);

  const syncFromSheet = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      setSyncing(true);
      if (showSkeleton) {
        setLoading(true);
      }

      try {
        const refreshRes = await fetch("/api/rates/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const refreshPayload = (await refreshRes.json()) as {
          success?: boolean;
          message?: string;
        };

        if (!refreshRes.ok || !refreshPayload.success) {
          throw new Error(refreshPayload.message || "Cache refresh failed");
        }

        await fetchRates();
      } catch (err) {
        if (showSkeleton && ratesCountRef.current === 0) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load rates. Check API / sheet sharing.",
          );
        }
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [fetchRates],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => setIsCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await fetchRates();
      } catch {
        if (!cancelled) {
          setError("Could not load rates. Check API / sheet sharing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const timer = window.setInterval(() => {
      void syncFromSheet({ showSkeleton: false });
    }, AUTO_SYNC_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchRates, syncFromSheet]);

  const exportCsv = () => downloadRatesCsv(filtered);

  const emptyMessage = rates.length
    ? "No cables matched your search."
    : error || "No rates loaded.";

  const skeletonRows = Math.max(6, Math.min(pageSize, 12));

  return (
    <div className="ps-root">
      <div className="ps-atmosphere" aria-hidden="true" />

      <div className="ps-app">
        <PriceSheetToolbar
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setCurrentPage(1);
          }}
          syncing={syncing}
          selectionMode={selectionMode}
          shareButtonLabel={shareButtonLabel}
          selectedCount={selectedRows.length}
          onSync={() => void syncFromSheet({ showSkeleton: true })}
          onShare={handleShareClick}
          onExport={exportCsv}
        />

        <main className="ps-main">
          <PriceSheetTable
            loading={loading}
            pageItems={pageItems}
            skeletonRows={skeletonRows}
            selectionMode={selectionMode}
            selectedKeys={selectedKeys}
            bulkSelectValue={bulkSelectValue}
            tableColSpan={tableColSpan}
            emptyMessage={emptyMessage}
            onSelectionMenuChange={onSelectionMenuChange}
            onToggleRow={toggleRow}
          />
          <PriceSheetMobileList
            loading={loading}
            pageItems={pageItems}
            selectionMode={selectionMode}
            selectedKeys={selectedKeys}
            bulkSelectValue={bulkSelectValue}
            emptyMessage={emptyMessage}
            onSelectionMenuChange={onSelectionMenuChange}
            onToggleRow={toggleRow}
          />
        </main>

        <PriceSheetPagination
          pageSize={pageSize}
          pageList={pageList}
          safePage={safePage}
          totalPages={totalPages}
          loading={loading}
          filteredLength={filtered.length}
          isCompact={isCompact}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
        />
      </div>

      <PriceSheetShareModal
        open={shareOpen}
        selectedRows={selectedRows}
        onClose={() => setShareOpen(false)}
        onShared={handleShareComplete}
      />
    </div>
  );
}
