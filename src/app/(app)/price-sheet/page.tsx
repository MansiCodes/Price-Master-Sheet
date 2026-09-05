"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { CableRate } from "@/lib/sheets/types";
import { rateRowKey } from "@/lib/price-sheet-share";
import { PriceSheetShareModal } from "@/app/(app)/price-sheet/PriceSheetShareModal";
import "./price-sheet.css";
import "./price-sheet-share.css";

const PAGE_SIZES = [10, 20, 50, 100, 200] as const;
const PAGE_SIZE_LABELS = PAGE_SIZES.map(String);
const BULK_SELECT_OPTIONS = ["Select All", "Deselect All"] as const;
const AUTO_SYNC_MS = 60_000;

function formatPrice(value: number): string {
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function buildPageList(total: number, currentPage: number, compact: boolean): number[] {
  if (total <= 1) return [1];

  if (compact) {
    // Sliding window of 2 pages (e.g. 2,3 … → 3,4 …) so mobile never crowds.
    if (total <= 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start =
      currentPage >= total ? Math.max(1, total - 1) : Math.max(1, currentPage);
    return [start, start + 1].filter((p) => p <= total);
  }

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

function ExportIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function SyncIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function ShareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

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
  const tableColSpan = selectionMode ? 8 : 7;

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

  const exportCsv = () => {
    if (!filtered.length) return;

    const header = [
      "S NO.",
      "NAME OF CABLE",
      "RM Costing (Per Box=305Mtr)",
      "P=10%",
      "P=12%",
      "P=15%",
      "P=20%",
    ];
    const lines = [
      header.join(","),
      ...filtered.map((row) =>
        [
          csvEscape(row.sNo ?? ""),
          csvEscape(row.name),
          csvEscape(row.rmCostingPerBox),
          csvEscape(row.p10),
          csvEscape(row.p12),
          csvEscape(row.p15),
          csvEscape(row.p20),
        ].join(","),
      ),
    ];

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `cable-rates-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const emptyMessage = rates.length
    ? "No cables matched your search."
    : error || "No rates loaded.";

  const skeletonRows = Math.max(6, Math.min(pageSize, 12));

  return (
    <div className="ps-root">
      <div className="ps-atmosphere" aria-hidden="true" />

      <div className="ps-app">
        <header className="ps-top">
          <div className="ps-toolbar">
            <label className="ps-search-wrap">
              <span className="ps-sr-only">Search cable</span>
              <span className="ps-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search cable or S NO"
                autoComplete="off"
                enterKeyHint="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            <div className="ps-toolbar-actions">
              <button
                type="button"
                className="ps-btn ps-btn-primary ps-desktop-inline"
                disabled={syncing}
                onClick={() => void syncFromSheet({ showSkeleton: true })}
              >
                <SyncIcon />
                Sync
              </button>
              <button
                type="button"
                className={`ps-btn ps-btn-secondary ps-desktop-inline${selectionMode ? " ps-btn-share-active" : ""}`}
                title={
                  selectionMode
                    ? selectedRows.length
                      ? "Add WhatsApp numbers and share"
                      : "Select cables to share"
                    : "Select cables to share"
                }
                onClick={handleShareClick}
              >
                <ShareIcon />
                {shareButtonLabel}
              </button>
              <button
                type="button"
                className="ps-btn ps-btn-secondary ps-desktop-inline"
                title="Export CSV"
                onClick={exportCsv}
              >
                <ExportIcon />
                Export
              </button>
            </div>
          </div>

          <div className="ps-header-actions ps-mobile-only">
            <button
              type="button"
              className="ps-icon-btn ps-icon-btn-primary"
              title="Sync Sheet"
              aria-label="Sync Sheet"
              disabled={syncing}
              onClick={() => void syncFromSheet({ showSkeleton: true })}
            >
              <SyncIcon size={20} />
            </button>
            <button
              type="button"
              className={`ps-icon-btn${selectionMode ? " ps-btn-share-active" : ""}`}
              title="Share selected"
              aria-label="Share selected"
              onClick={handleShareClick}
            >
              <ShareIcon size={20} />
            </button>
            <button
              type="button"
              className="ps-icon-btn"
              title="Export CSV"
              aria-label="Export CSV"
              onClick={exportCsv}
            >
              <ExportIcon size={20} />
            </button>
          </div>
        </header>

        <main className="ps-main">
          <section className="ps-panel ps-desktop-only">
            <div className="ps-table-shell">
              <table className="ps-rates-table">
                <thead>
                  <tr>
                    {selectionMode ? (
                      <th className="ps-col-check">
                        <label className="ps-sr-only" htmlFor="ps-select-action-desktop">
                          Bulk select
                        </label>
                        <SelectMenu
                          id="ps-select-action-desktop"
                          className="ps-select-action"
                          value={bulkSelectValue}
                          options={BULK_SELECT_OPTIONS}
                          placeholder="Select"
                          onChange={onSelectionMenuChange}
                        />
                      </th>
                    ) : null}
                    <th className="ps-col-sno">S NO.</th>
                    <th className="ps-col-name">NAME OF CABLE</th>
                    <th className="ps-col-price ps-col-rm">RM Costing (Per Box=305Mtr)</th>
                    <th className="ps-col-price">P=10%</th>
                    <th className="ps-col-price">P=12%</th>
                    <th className="ps-col-price">P=15%</th>
                    <th className="ps-col-price">P=20%</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: skeletonRows }, (_, i) => (
                        <tr key={`sk-${i}`}>
                          {selectionMode ? <td><span className="ps-skeleton ps-sk-sno" /></td> : null}
                          <td><span className="ps-skeleton ps-sk-sno" /></td>
                          <td><span className="ps-skeleton ps-sk-name" /></td>
                          <td><span className="ps-skeleton ps-sk-price" /></td>
                          <td><span className="ps-skeleton ps-sk-price" /></td>
                          <td><span className="ps-skeleton ps-sk-price" /></td>
                          <td><span className="ps-skeleton ps-sk-price" /></td>
                          <td><span className="ps-skeleton ps-sk-price" /></td>
                        </tr>
                      ))
                    : pageItems.length === 0
                      ? (
                          <tr className="ps-empty-row">
                            <td colSpan={tableColSpan}>{emptyMessage}</td>
                          </tr>
                        )
                      : pageItems.map((row) => {
                          const key = rateRowKey(row);
                          return (
                          <tr key={key}>
                            {selectionMode ? (
                              <td className="ps-col-check">
                                <input
                                  type="checkbox"
                                  className="ps-row-check"
                                  aria-label={`Select ${row.name}`}
                                  checked={selectedKeys.has(key)}
                                  onChange={() => toggleRow(key)}
                                />
                              </td>
                            ) : null}
                            <td className="ps-sno">{row.sNo ?? "—"}</td>
                            <td className="ps-name" title={row.name}>{row.name}</td>
                            <td className="ps-price ps-price-primary">
                              {formatPrice(row.rmCostingPerBox)}
                            </td>
                            <td className="ps-price">{formatPrice(row.p10)}</td>
                            <td className="ps-price">{formatPrice(row.p12)}</td>
                            <td className="ps-price">{formatPrice(row.p15)}</td>
                            <td className="ps-price">{formatPrice(row.p20)}</td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="ps-mobile-list ps-mobile-only" aria-live="polite">
            {selectionMode ? (
              <div className="ps-mobile-select-bar">
                <label className="ps-sr-only" htmlFor="ps-select-action-mobile">
                  Bulk select
                </label>
                <SelectMenu
                  id="ps-select-action-mobile"
                  className="ps-select-action"
                  value={bulkSelectValue}
                  options={BULK_SELECT_OPTIONS}
                  placeholder="Select"
                  onChange={onSelectionMenuChange}
                />
              </div>
            ) : null}
            {loading
              ? Array.from({ length: 10 }, (_, i) => (
                  <article key={`msk-${i}`} className="ps-skeleton-card">
                    <div className="ps-sk-line ps-sk-title" />
                    <div className="ps-sk-line ps-sk-sub" />
                    <div className="ps-sk-prices">
                      <div className="ps-sk-chip" />
                      <div className="ps-sk-chip" />
                      <div className="ps-sk-chip" />
                      <div className="ps-sk-chip" />
                      <div className="ps-sk-chip" />
                    </div>
                  </article>
                ))
              : pageItems.length === 0
                ? <p className="ps-mobile-empty">{emptyMessage}</p>
                : pageItems.map((row) => {
                    const key = rateRowKey(row);
                    return (
                    <article key={`m-${key}`} className="ps-rate-card">
                      {selectionMode ? (
                        <label className="ps-rate-card-select">
                          <input
                            type="checkbox"
                            className="ps-row-check"
                            checked={selectedKeys.has(key)}
                            onChange={() => toggleRow(key)}
                          />
                          <span>Select</span>
                        </label>
                      ) : null}
                      <div className="ps-rate-card-top">
                        <p className="ps-rate-card-name" title={row.name}>{row.name}</p>
                        <span className="ps-rate-card-sno">{row.sNo ?? "—"}</span>
                      </div>
                      <div className="ps-rate-card-prices">
                        <div className="ps-price-chip is-primary">
                          <span>Per Box</span>
                          <strong>{formatPrice(row.rmCostingPerBox)}</strong>
                        </div>
                        <div className="ps-price-chip">
                          <span>P=10%</span>
                          <strong>{formatPrice(row.p10)}</strong>
                        </div>
                        <div className="ps-price-chip">
                          <span>P=12%</span>
                          <strong>{formatPrice(row.p12)}</strong>
                        </div>
                        <div className="ps-price-chip">
                          <span>P=15%</span>
                          <strong>{formatPrice(row.p15)}</strong>
                        </div>
                        <div className="ps-price-chip">
                          <span>P=20%</span>
                          <strong>{formatPrice(row.p20)}</strong>
                        </div>
                      </div>
                    </article>
                  );
                  })}
          </div>
        </main>

        <nav className="ps-pagination" aria-label="Rates pagination">
          <div className="ps-page-size-wrap">
            <span className="ps-field-label">Per page</span>
            <SelectMenu
              className="ps-page-size-select"
              value={String(pageSize)}
              options={PAGE_SIZE_LABELS}
              onChange={(next) => {
                const size = Number(next);
                setPageSize(
                  PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number]) ? size : 10,
                );
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="ps-pagination__nav">
            <button
              type="button"
              className="ps-page-nav"
              disabled={loading || safePage <= 1 || filtered.length === 0}
              aria-label="Previous page"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <span className="ps-desktop-inline">Prev</span>
              <span className="ps-mobile-only" aria-hidden="true">
                ‹
              </span>
            </button>

            <div className="ps-page-numbers">
              {!loading && filtered.length > 0
                ? (() => {
                    const lastShown = pageList[pageList.length - 1] ?? 0;
                    const showTrailingEllipsis =
                      isCompact && lastShown > 0 && lastShown < totalPages;
                    return (
                      <>
                        {pageList.flatMap((page, index) => {
                          const prev = pageList[index - 1];
                          const showEllipsis =
                            prev !== undefined && page - prev > 1;
                          const items = [];
                          if (showEllipsis) {
                            items.push(
                              <span
                                key={`e-${page}`}
                                className="ps-page-ellipsis"
                                aria-hidden="true"
                              >
                                …
                              </span>,
                            );
                          }
                          items.push(
                            <button
                              key={page}
                              type="button"
                              className={`ps-page-btn${page === safePage ? " is-active" : ""}`}
                              aria-label={`Page ${page}`}
                              aria-current={
                                page === safePage ? "page" : undefined
                              }
                              disabled={loading}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>,
                          );
                          return items;
                        })}
                        {showTrailingEllipsis ? (
                          <span className="ps-page-ellipsis" aria-hidden="true">
                            …
                          </span>
                        ) : null}
                      </>
                    );
                  })()
                : null}
            </div>

            <button
              type="button"
              className="ps-page-nav"
              disabled={loading || safePage >= totalPages || filtered.length === 0}
              aria-label="Next page"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span className="ps-desktop-inline">Next</span>
              <span className="ps-mobile-only" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        </nav>
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
