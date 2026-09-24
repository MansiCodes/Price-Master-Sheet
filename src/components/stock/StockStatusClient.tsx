"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Pagination } from "@/components/ui/Pagination";
import { todayDateString } from "@/lib/dates";
import {
  getQuadSignalCableSizes,
  QUAD_SIGNAL_STOCK_CABLES,
  quadSignalCableSizeDedupeKey,
} from "@/lib/plant-catalogs";
import {
  isQuadCableName,
  isSignallingCableName,
  normalizeCableName,
} from "@/lib/quad-signal-wip";
import {
  formatCallPutupItem,
  formatCallPutupItemsList,
  formatDispatchItem,
  formatDispatchItemsList,
  formatProcessStatusItem,
  formatSharedInsulationItem,
  type CableStockStatusBlock,
  type RawMaterialStockRow,
  type SharedInsulationStatus,
} from "@/lib/stock-production-status";
import {
  lookupStockOrder,
  toSizeMatchKey,
  type StockOrderBySize,
} from "@/lib/stock/order-excel-types";
import "@/components/ui/date-filter.css";
import "./stock-status.css";

const DEFAULT_PAGE_SIZE = 10;

function formatDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Clean cached Excel delivery text (e.g. strip "Comm :") and format for display. */
function formatDeliveryDisplay(raw: string | null | undefined): string {
  if (!raw) return "—";
  let s = raw
    .replace(/^(comm(ercial)?|del(ivery)?(\s*period)?|due)\s*[:\-–]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDisplayDate(s);
  const embedded = s.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/);
  if (embedded) {
    const day = embedded[1].padStart(2, "0");
    const month = embedded[2].padStart(2, "0");
    let year = Number(embedded[3]);
    if (year < 100) year += 2000;
    return `${day}/${month}/${year}`;
  }
  return s;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // No grouping commas — keep qty values clean in the card
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}

function getPartyInHandKm(
  partyName: string,
  block?: CableStockStatusBlock | null,
): number {
  if (!block) return 0;
  const party = (partyName ?? "").trim().toLowerCase();
  const cleanParty = party.replace(/[^a-z0-9]/g, "");
  if (!cleanParty) return 0;

  function matchesParty(targetName: string): boolean {
    const target = (targetName ?? "").trim().toLowerCase();
    const cleanTarget = target.replace(/[^a-z0-9]/g, "");
    if (!cleanTarget) return false;
    if (cleanParty.includes(cleanTarget) || cleanTarget.includes(cleanParty)) {
      return true;
    }
    const words = target.split(/\s+/).filter((w) => w.length > 1);
    return words.length > 0 && words.every((w) => party.includes(w));
  }

  let putupSum = 0;
  if (Array.isArray(block.callPutupItems) && block.callPutupItems.length > 0) {
    for (const item of block.callPutupItems) {
      const q = Number(item.qty);
      const qty = Number.isFinite(q) && q > 0 ? q : 0;
      if (qty > 0 && matchesParty(item.partyName ?? "")) {
        putupSum += qty;
      }
    }
  } else if (block.putupKm && block.putupKm > 0) {
    if (matchesParty(block.partyName ?? "")) {
      putupSum = block.putupKm;
    }
  }

  let dispatchSum = 0;
  if (Array.isArray(block.dispatchPendingItems) && block.dispatchPendingItems.length > 0) {
    for (const item of block.dispatchPendingItems) {
      const q = Number(item.qty);
      const qty = Number.isFinite(q) && q > 0 ? q : 0;
      if (qty > 0 && matchesParty(item.dispatchParty ?? "")) {
        dispatchSum += qty;
      }
    }
  } else if (block.dispatchPending && block.dispatchPending > 0) {
    if (matchesParty(block.dispatchParty || block.partyName || "")) {
      dispatchSum = block.dispatchPending;
    }
  }

  return Math.round((putupSum + dispatchSum) * 10000) / 10000;
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function getProcessIcon(name: string) {
  const n = name.trim().toLowerCase();
  if (n.includes("lay")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 0-7.07 17.07l1.41-1.41A8 8 0 1 1 12 20v2a10 10 0 0 0 0-20z"/></svg>
    );
  }
  if (n.includes("inner")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
    );
  }
  if (n.includes("dst") || n.includes("screen") || n.includes("armour")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
  );
}

const ALL_CABLES = "All cables";
const ALL_SIZES = "All sizes";

const CABLE_TYPES = QUAD_SIGNAL_STOCK_CABLES.filter((c) => c !== "Other");

type DisplayCard = {
  key: string;
  cable: string;
  size: string;
  block: CableStockStatusBlock | null;
};

function isCatalogCable(cable: string): boolean {
  return (CABLE_TYPES as readonly string[]).includes(cable);
}

function catalogSizesForCable(cable: string): string[] {
  return getQuadSignalCableSizes(
    isCatalogCable(cable) ? cable : "Other",
  ).filter((s) => s !== "Other");
}

export function StockStatusClient({
  plantId,
  date,
  tab,
  cableBlocks,
  sharedInsulation,
  rawRows,
}: {
  plantId: string;
  date: string;
  tab: "cable" | "raw";
  cableBlocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
  rawRows: RawMaterialStockRow[];
}) {
  const router = useRouter();
  const today = todayDateString();
  const isToday = date === today;
  const dateInputRef = useRef<HTMLInputElement>(null);
  const ordersFileRef = useRef<HTMLInputElement>(null);
  const emptyLabel = isToday
    ? "No data for today"
    : `No data for ${formatDisplayDate(date)}`;

  const [cableType, setCableType] = useState(ALL_CABLES);
  const [cableSize, setCableSize] = useState(ALL_SIZES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [ordersByKey, setOrdersByKey] = useState<Record<
    string,
    StockOrderBySize
  > | null>(null);
  const [ordersFileName, setOrdersFileName] = useState<string | null>(null);
  const [ordersUploading, setOrdersUploading] = useState(false);
  const [ordersHydrated, setOrdersHydrated] = useState(false);
  const [rmSearchQuery, setRmSearchQuery] = useState("");

  const ordersStorageKey = `stock-orders-excel:v2:${plantId}`;

  useEffect(() => {
    let ignore = false;
    // Hydrate local cache first for fast display
    try {
      const raw = window.localStorage.getItem(ordersStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          byKey?: Record<string, StockOrderBySize>;
          fileName?: string | null;
        };
        if (parsed.byKey && typeof parsed.byKey === "object") {
          setOrdersByKey(parsed.byKey);
          setOrdersFileName(parsed.fileName ?? null);
        }
      }
    } catch {
      // ignore bad cache
    }

    // Always fetch latest persisted orders from database so all devices/users are in sync
    fetch(`/api/plants/${plantId}/stock/orders-excel`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { byKey?: Record<string, StockOrderBySize> } | null) => {
          if (ignore || !data?.byKey) return;
          if (Object.keys(data.byKey).length > 0) {
            setOrdersByKey(data.byKey);
          }
        },
      )
      .catch(() => {})
      .finally(() => {
        if (!ignore) setOrdersHydrated(true);
      });

    return () => {
      ignore = true;
    };
  }, [plantId, ordersStorageKey]);

  useEffect(() => {
    if (!ordersHydrated) return;
    try {
      if (!ordersByKey) {
        window.localStorage.removeItem(ordersStorageKey);
        return;
      }
      window.localStorage.setItem(
        ordersStorageKey,
        JSON.stringify({ byKey: ordersByKey, fileName: ordersFileName }),
      );
    } catch {
      // quota / private mode
    }
  }, [ordersByKey, ordersFileName, ordersHydrated, ordersStorageKey]);

  /** Custom cable names saved via form "Other" (not in catalog). */
  const extraCablesFromData = useMemo(() => {
    const set = new Set<string>();
    for (const b of cableBlocks) {
      const cable = b.cable.trim();
      if (cable && !isCatalogCable(cable)) set.add(cable);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cableBlocks]);

  const cableTypeOptions = useMemo(
    () => [ALL_CABLES, ...CABLE_TYPES, ...extraCablesFromData],
    [extraCablesFromData],
  );

  const activeCable = cableTypeOptions.includes(cableType)
    ? cableType
    : ALL_CABLES;
  const showAllCables = activeCable === ALL_CABLES;

  const cablesInView = useMemo(
    () =>
      showAllCables
        ? [...CABLE_TYPES, ...extraCablesFromData]
        : [activeCable],
    [showAllCables, activeCable, extraCablesFromData],
  );

  const catalogSizes = useMemo(() => {
    if (showAllCables) {
      const set = new Set<string>();
      for (const cable of CABLE_TYPES) {
        for (const s of catalogSizesForCable(cable)) set.add(s);
      }
      return Array.from(set);
    }
    return catalogSizesForCable(activeCable);
  }, [showAllCables, activeCable]);

  /** Custom sizes saved via form "Other" or uploaded in Excel Orders. */
  const extraSizesFromData = useMemo(() => {
    const set = new Set<string>();
    for (const b of cableBlocks) {
      if (!showAllCables && b.cable !== activeCable) continue;
      const known = new Set(catalogSizesForCable(b.cable));
      if (b.size && !known.has(b.size)) set.add(b.size);
    }
    if (ordersByKey) {
      for (const order of Object.values(ordersByKey)) {
        const cable = order.cable || "Signalling Cable";
        if (!showAllCables && cable !== activeCable) continue;
        const known = new Set(catalogSizesForCable(cable));
        if (order.size && !known.has(order.size)) set.add(order.size);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cableBlocks, ordersByKey, showAllCables, activeCable]);

  const sizeOptions = useMemo(
    () => [ALL_SIZES, ...catalogSizes, ...extraSizesFromData],
    [catalogSizes, extraSizesFromData],
  );

  const blocksByKey = useMemo(() => {
    const map = new Map<string, CableStockStatusBlock>();
    for (const b of cableBlocks) {
      const key = quadSignalCableSizeDedupeKey(b.cable, b.size);
      if (!map.has(key)) {
        map.set(key, b);
      }
    }
    return map;
  }, [cableBlocks]);

  const displayCards = useMemo((): DisplayCard[] => {
    const cards: DisplayCard[] = [];
    const seen = new Set<string>();

    for (const cable of cablesInView) {
      const sizes = catalogSizesForCable(cable);
      for (const size of sizes) {
        if (cableSize !== ALL_SIZES && toSizeMatchKey(size) !== toSizeMatchKey(cableSize)) continue;
        const dedupeKey = quadSignalCableSizeDedupeKey(cable, size);
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        cards.push({
          key: `${cable} · ${size}`,
          cable,
          size,
          block: blocksByKey.get(dedupeKey) ?? null,
        });
      }
    }

    // Entries saved with custom sizes/variants (e.g. 12 Core x 1.5sqmm LSZH)
    for (const b of cableBlocks) {
      const dedupeKey = quadSignalCableSizeDedupeKey(b.cable, b.size);
      if (seen.has(dedupeKey)) continue;
      if (!showAllCables && normalizeCableName(b.cable) !== normalizeCableName(activeCable)) continue;
      if (cableSize !== ALL_SIZES && toSizeMatchKey(b.size) !== toSizeMatchKey(cableSize)) continue;
      seen.add(dedupeKey);
      cards.push({
        key: `${normalizeCableName(b.cable)} · ${b.size}`,
        cable: normalizeCableName(b.cable),
        size: b.size,
        block: b,
      });
    }

    // Dynamic sizes from Excel Orders (creates cards if not in catalog/stock)
    if (ordersByKey) {
      for (const order of Object.values(ordersByKey)) {
        const rawCable = order.cable || "Signalling Cable";
        const cable = normalizeCableName(rawCable);
        const size = order.size;
        if (!size) continue;
        const dedupeKey = quadSignalCableSizeDedupeKey(cable, size);
        if (seen.has(dedupeKey)) continue;
        if (!showAllCables && cable !== normalizeCableName(activeCable)) continue;
        if (cableSize !== ALL_SIZES && toSizeMatchKey(size) !== toSizeMatchKey(cableSize)) continue;
        seen.add(dedupeKey);
        cards.push({
          key: `${cable} · ${size}`,
          cable,
          size,
          block: blocksByKey.get(dedupeKey) ?? null,
        });
      }
    }

    // Filled data / orders first, then empty.
    cards.sort((a, b) => {
      const aHas = a.block || lookupStockOrder(ordersByKey, a.cable, a.size) ? 0 : 1;
      const bHas = b.block || lookupStockOrder(ordersByKey, b.cable, b.size) ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;

      const aCable = CABLE_TYPES.indexOf(
        a.cable as (typeof CABLE_TYPES)[number],
      );
      const bCable = CABLE_TYPES.indexOf(
        b.cable as (typeof CABLE_TYPES)[number],
      );
      const aCableOrd = aCable === -1 ? 999 : aCable;
      const bCableOrd = bCable === -1 ? 999 : bCable;
      if (aCableOrd !== bCableOrd) return aCableOrd - bCableOrd;
      if (a.cable !== b.cable) return a.cable.localeCompare(b.cable);

      const sizes = catalogSizesForCable(a.cable);
      const aIdx = sizes.indexOf(a.size);
      const bIdx = sizes.indexOf(b.size);
      const aOrd = aIdx === -1 ? 9999 : aIdx;
      const bOrd = bIdx === -1 ? 9999 : bIdx;
      if (aOrd !== bOrd) return aOrd - bOrd;
      return a.size.localeCompare(b.size);
    });

    return cards;
  }, [
    cablesInView,
    cableSize,
    blocksByKey,
    cableBlocks,
    ordersByKey,
    showAllCables,
    activeCable,
  ]);

  useEffect(() => {
    setPage(1);
  }, [tab, date, activeCable, cableSize, pageSize]);

  const pagedCards = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayCards.slice(start, start + pageSize);
  }, [displayCards, page, pageSize]);

  const filteredRawRows = useMemo(() => {
    if (!rmSearchQuery.trim()) return rawRows;
    const q = rmSearchQuery.trim().toLowerCase();
    return rawRows.filter((r) => r.item.toLowerCase().includes(q));
  }, [rawRows, rmSearchQuery]);

  const pagedRawRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRawRows.slice(start, start + pageSize);
  }, [filteredRawRows, page, pageSize]);

  const listTotal = tab === "raw" ? filteredRawRows.length : displayCards.length;

  function changePageSize(next: number) {
    setPage(1);
    setPageSize(next);
  }

  const rawTotals = useMemo(() => {
    let qty = 0;
    let value = 0;
    let hasQty = false;
    let hasValue = false;
    for (const row of rawRows) {
      if (!row.hasData) continue;
      if (row.qty != null && Number.isFinite(row.qty)) {
        qty += row.qty;
        hasQty = true;
      }
      if (row.value != null && Number.isFinite(row.value)) {
        value += row.value;
        hasValue = true;
      }
    }
    return {
      qty: hasQty ? Math.round(qty * 10000) / 10000 : null,
      value: hasValue ? Math.round(value * 10000) / 10000 : null,
      hasAny: hasQty || hasValue,
    };
  }, [rawRows]);

  const showInsulationCard =
    showAllCables || isSignallingCableName(activeCable);

  function setDate(next: string) {
    if (!next || next > today) return;
    const params = new URLSearchParams();
    params.set("date", next);
    if (tab !== "cable") params.set("tab", tab);
    router.push(`/stock?${params.toString()}`);
  }

  function setTab(next: "cable" | "raw") {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (next !== "cable") params.set("tab", next);
    const qs = params.toString();
    router.push(qs ? `/stock?${qs}` : "/stock");
  }

  function openCalendar() {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
    }
  }

  async function onOrdersExcelSelected(file: File | null) {
    if (!file) return;
    setOrdersUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(
        `/api/plants/${plantId}/stock/orders-excel`,
        { method: "POST", body },
      );
      const json = (await res.json()) as {
        error?: string;
        byKey?: Record<string, StockOrderBySize>;
        matchedRows?: number;
        unmatchedSizes?: string[];
        fileName?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Upload failed");
      }
      setOrdersByKey(json.byKey ?? {});
      setOrdersFileName(json.fileName ?? file.name);
      const unmatched = json.unmatchedSizes?.length ?? 0;
      toast.success(
        unmatched > 0
          ? `Matched ${json.matchedRows ?? 0} row(s); ${unmatched} size(s) not mapped`
          : `Matched ${json.matchedRows ?? 0} order row(s)`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setOrdersUploading(false);
      if (ordersFileRef.current) ordersFileRef.current.value = "";
    }
  }

  function clearOrders() {
    setOrdersByKey(null);
    setOrdersFileName(null);
    fetch(`/api/plants/${plantId}/stock/orders-excel`, { method: "DELETE" }).catch(() => {});
  }

  const hasOrders = Boolean(ordersByKey && Object.keys(ordersByKey).length > 0);

  return (
    <div className={`stock-status-page${hasOrders ? " has-orders" : ""}`}>
      <div className="stock-status-toolbar">
        <div className="stock-status-toolbar__top-row">
          <div className="stock-status-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "cable"}
              className={`stock-status-tabs__btn${tab === "cable" ? " is-active" : ""}`}
              onClick={() => setTab("cable")}
            >
              Cable
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "raw"}
              className={`stock-status-tabs__btn${tab === "raw" ? " is-active" : ""}`}
              onClick={() => setTab("raw")}
            >
              Raw Materials
            </button>
          </div>

          <div className="stock-status-toolbar__date" aria-label="Stock date">
            <span
              className={`stock-status-today-pill${isToday ? " is-today" : ""}`}
            >
              {isToday ? "Today" : formatDisplayDate(date)}
            </span>
            <button
              type="button"
              className="stock-status-cal-btn"
              aria-label="Choose stock date"
              onClick={openCalendar}
            >
              <CalendarIcon />
            </button>
            <div className="pnl-date-filter stock-status-date-full">
              <div className="pnl-date-filter__field">
                <label htmlFor="stock-date" className="sr-only">
                  Calendar
                </label>
                <div className="pnl-date-filter__input-wrap">
                  <input
                    ref={dateInputRef}
                    id="stock-date"
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                    onClick={openCalendar}
                    aria-label="Choose stock date"
                  />
                </div>
              </div>
            </div>
          </div>

          {tab === "cable" ? (
            <div className="stock-orders-upload">
              <input
                ref={ordersFileRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) =>
                  void onOrdersExcelSelected(e.target.files?.[0] ?? null)
                }
              />
              <button
                type="button"
                className="stock-orders-upload__btn"
                disabled={ordersUploading}
                onClick={() => ordersFileRef.current?.click()}
              >
                {ordersUploading ? "Reading…" : "Upload"}
              </button>
              {ordersFileName ? (
                <button
                  type="button"
                  className="stock-orders-upload__clear"
                  onClick={clearOrders}
                  title={ordersFileName}
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {tab === "raw" ? (
        <div className="stock-status-report rm-report-view">

          {/* Top 3 Summary Stat Cards */}
          <div className="rm-summary-grid">
            <div className="rm-stat-card">
              <span className="rm-stat-card__label">Total Items</span>
              <div className="rm-stat-card__body">
                <div className="rm-stat-card__icon rm-stat-card__icon--teal">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </div>
                <span className="rm-stat-card__val">
                  {filteredRawRows.filter(r => r.hasData).length || filteredRawRows.length}
                </span>
              </div>
            </div>

            <div className="rm-stat-card">
              <span className="rm-stat-card__label">Total Quantity</span>
              <div className="rm-stat-card__body">
                <div className="rm-stat-card__icon rm-stat-card__icon--blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <span className="rm-stat-card__val">
                  {formatNum(rawTotals.qty ?? 0)} <span className="rm-stat-card__unit">KGS</span>
                </span>
              </div>
            </div>

            <div className="rm-stat-card">
              <span className="rm-stat-card__label">Total Inventory Value</span>
              <div className="rm-stat-card__body">
                <div className="rm-stat-card__icon rm-stat-card__icon--green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a4.5 4.5 0 0 0 0-9" />
                  </svg>
                </div>
                <span className="rm-stat-card__val">
                  {formatNum(rawTotals.value ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Raw Materials List Table Container */}
          <div className="rm-card-container">
            <div className="rm-card-header">
              <h3 className="rm-card-title">Raw Materials List</h3>
              <div className="rm-card-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search item…"
                  value={rmSearchQuery}
                  onChange={(e) => {
                    setRmSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="stock-rm-table-wrap">
              <table className="stock-rm-table stock-rm-table--zebra">
                <thead>
                  <tr>
                    <th scope="col" className="text-center">S. NO.</th>
                    <th scope="col">ITEM</th>
                    <th scope="col" className="text-right">QTY</th>
                    <th scope="col" className="text-center">UNIT</th>
                    <th scope="col" className="text-right">RATE</th>
                    <th scope="col" className="text-right">VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRawRows.map((row, idx) => (
                    <tr
                      key={row.item}
                      className={row.hasData ? undefined : "is-empty"}
                    >
                      <td className="text-center">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="font-semibold">{row.item}</td>
                      <td className="text-right font-medium">
                        {row.hasData && row.qty != null
                          ? formatNum(row.qty)
                          : "—"}
                      </td>
                      <td className="text-center">{row.hasData ? row.unit || "KGS" : "—"}</td>
                      <td className="text-right">
                        {row.hasData && row.rate != null
                          ? formatNum(row.rate)
                          : "—"}
                      </td>
                      <td className="text-right font-semibold">
                        {row.hasData && row.value != null
                          ? formatNum(row.value)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rawTotals.hasAny ? (
                  <tfoot>
                    <tr className="stock-rm-table__total">
                      <td />
                      <td>Total</td>
                      <td className="text-right">
                        {rawTotals.qty != null ? formatNum(rawTotals.qty) : "—"}
                      </td>
                      <td className="text-center">—</td>
                      <td className="text-right">—</td>
                      <td className="text-right">
                        {rawTotals.value != null
                          ? formatNum(rawTotals.value)
                          : "—"}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={listTotal}
              onPageChange={setPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        </div>
      ) : (
        <div className="stock-status-report">
          <div className="stock-status-filters form-grid two">
            <div className="field">
              <label htmlFor="stock-cable-type">Cable type</label>
              <SelectMenu
                id="stock-cable-type"
                value={activeCable}
                options={cableTypeOptions}
                required
                onChange={(next) => {
                  setCableType(next);
                  setCableSize(ALL_SIZES);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="stock-cable-size">Cable size</label>
              <SelectMenu
                id="stock-cable-size"
                value={
                  sizeOptions.includes(cableSize) ? cableSize : ALL_SIZES
                }
                options={sizeOptions}
                required
                onChange={setCableSize}
              />
            </div>
          </div>

          {(() => {
            const totalOrderInHandKm = ordersByKey
              ? Object.values(ordersByKey).reduce(
                  (sum, order) => sum + (order?.totalQty ?? 0),
                  0,
                )
              : 0;
            const activeOrdersCount = ordersByKey
              ? Object.keys(ordersByKey).length
              : 0;
            const totalFinishedStockKm = cableBlocks.reduce(
              (sum, b) => sum + (b.totalKm ?? 0),
              0,
            );
            const totalPendingDispatchKm = cableBlocks.reduce(
              (sum, b) => sum + (b.dispatchPending ?? 0),
              0,
            );
            const totalInsulationKm = sharedInsulation?.closing ?? 0;
            const totalLengthBoth =
              Math.round((totalFinishedStockKm + totalInsulationKm) * 100) / 100;

            return (
              <>
                <ol className="stock-status-grid">
                  {showInsulationCard ? (
                    <li className="stock-status-card stock-status-card--insulation-hero">
                      <div className="insul-hero__left">
                        <div className="insul-hero__img">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        </div>
                        <div className="insul-hero__details">
                          <h3 className="insul-hero__title">
                            {activeCable === ALL_CABLES ? "Signalling Cable" : activeCable} <span className="insul-hero__bullet">&bull;</span> Insulation
                          </h3>
                          <p className="insul-hero__meta">
                            Insul: <strong>{formatNum(sharedInsulation?.closing ?? 0)}km ({formatNum(sharedInsulation?.consumed ?? 0)}km)</strong>
                          </p>
                          <p className="insul-hero__closing">
                            Closing &mdash; <strong>{formatNum(sharedInsulation?.closing ?? 0)}km</strong>
                          </p>
                        </div>
                      </div>
                    </li>
                  ) : null}

            {pagedCards.map((card, idx) => {
              const block = card.block;
              const order = lookupStockOrder(ordersByKey, card.cable, card.size);
              const putupItem = block
                ? formatCallPutupItem({
                    putupKm: block.putupKm ?? 0,
                    callPutup: block.callPutup ?? "",
                    putupDate: block.putupDate
                      ? formatDisplayDate(block.putupDate)
                      : "",
                    partyName: block.partyName ?? "",
                  })
                : null;
              const dispatchItem = block
                ? formatDispatchItem({
                    partyName: block.partyName ?? "",
                    dispatchParty: block.dispatchParty ?? "",
                    dispatchPending: block.dispatchPending ?? 0,
                  })
                : null;
              const stockTotal = block?.totalKm ?? 0;
              const orderQty = order?.totalQty ?? 0;
              const putupKm = block?.putupKm ?? 0;
              const dispatchPending = block?.dispatchPending ?? 0;
              const totalDoneKm = putupKm + dispatchPending;
              const balanceTotal =
                Math.round((orderQty - totalDoneKm - stockTotal) * 10000) / 10000;
              const partyLines = order
                ? order.parties.filter(
                    (p) => p.partyName.trim() && p.partyName.trim() !== "—",
                  )
                : [];
              const deliveryDates = order
                ? [
                    ...new Set(
                      order.parties
                        .map((p) => p.deliveryPeriod)
                        .filter((d): d is string => Boolean(d)),
                    ),
                  ]
                : [];

              return (
                <li
                  key={card.key}
                  className={`stock-status-card${block ? "" : " is-empty"}${
                    order ? " has-order" : ""
                  }`}
                >
                  <div className="stock-status-card__header">
                    <div className="stock-status-card__title-group">
                      <span className="stock-status-card__icon-tile">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      </span>
                      <h3 className="stock-status-card__cable-name">
                        {card.cable} <span className="stock-status-card__index">({(page - 1) * pageSize + idx + 1})</span>
                      </h3>
                    </div>
                    <span className="stock-status-card__size-pill">
                      {card.size}
                    </span>
                  </div>

                  <div className="stock-status-card__body">
                    <div className="stock-status-card__stock">
                      {block ? (
                        <>
                          <div className="stock-proc-grid">
                            {block.processes.map((p) => {
                              const item = formatProcessStatusItem(p);
                              return (
                                <div key={p.name} className="stock-proc-chip">
                                  <div className="stock-proc-chip__head">
                                    <span className="stock-proc-chip__icon">{getProcessIcon(p.name)}</span>
                                    <span className="stock-proc-chip__label">{p.name}</span>
                                  </div>
                                  <span className="stock-proc-chip__val">{item.value}</span>
                                </div>
                              );
                            })}
                          </div>

                          {block && formatCallPutupItemsList(block).length > 0 ? (
                            <div className="stock-call-putup-line">
                              <span className="stock-call-putup-icon"><CalendarIcon /></span>
                              <span className="stock-call-putup-text">
                                {formatCallPutupItemsList(block)
                                  .map((p) => `${p.label} ${p.value}`)
                                  .join(" | ")}
                              </span>
                            </div>
                          ) : null}

                          <div className="stock-total-row">
                            <div className="stock-total-group">
                              <span className="stock-total-label">Total</span>
                              <span className="stock-total-value">{formatNum(stockTotal)} km</span>
                            </div>
                            {block && formatDispatchItemsList(block).length > 0 ? (
                              <div className="stock-dispatch-group">
                                <span className="stock-dispatch-text">
                                  {formatDispatchItemsList(block)
                                    .map((d) => `${d.label} ${d.value}`)
                                    .join(" | ")}
                                </span>
                                <span className="stock-pending-badge">Pending Dispatch</span>
                              </div>
                            ) : (
                              <span className="stock-closing-date">Closing stock as on {block.entryDate}</span>
                            )}
                          </div>

                          {block.userNotes &&
                          !/^closing stock as on/i.test(block.userNotes.trim()) ? (
                            <p className="stock-status-card__notes">
                              {block.userNotes}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="stock-status-card__empty">{emptyLabel}</p>
                      )}
                    </div>

                    {order ? (
                      <div
                        className="stock-status-card__orders"
                        aria-label="Orders in hand"
                      >
                        <div className="stock-status-card__orders-header">
                          <div className="stock-status-card__orders-summary">
                            <span className="stock-status-card__orders-title">
                              ORDER IN HAND
                            </span>
                            <span className="stock-status-card__dash" aria-hidden>
                              {" "}
                              —{" "}
                            </span>
                            <span className="stock-status-card__orders-qty">
                              <strong>{formatNum(order.totalQty)}</strong> km
                            </span>
                          </div>
                          <div className="stock-status-card__orders-avail">
                            <span className="stock-status-card__avail-label">
                              Balance
                            </span>
                            <span className="stock-status-card__dash" aria-hidden>
                              {" "}
                              —{" "}
                            </span>
                            <span
                              className={`stock-status-card__avail-value${
                                balanceTotal > 0 ? " is-short" : ""
                              }`}
                            >
                              {formatNum(balanceTotal)} km
                            </span>
                          </div>
                        </div>

                        {partyLines.length > 0 ? (
                          <div className="stock-status-card__party-table-wrapper">
                            <table className="stock-status-card__party-table">
                              <thead>
                                <tr>
                                  <th scope="col" className="col-party">
                                    PARTY NAME
                                  </th>
                                  <th scope="col" className="col-qty">
                                    QTY
                                  </th>
                                  <th scope="col" className="col-inhand">
                                    DONE
                                  </th>
                                  <th scope="col" className="col-balance">
                                    BALANCE
                                  </th>
                                  <th scope="col" className="col-delivery">
                                    D.P.
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {partyLines.map((p, i) => {
                                  const inHandKm = getPartyInHandKm(
                                    p.partyName,
                                    block,
                                  );
                                  const partyBalance = Math.max(
                                    0,
                                    Math.round((p.qty - inHandKm) * 10000) /
                                      10000,
                                  );
                                  return (
                                    <tr
                                      key={`${p.partyName}-${
                                        p.deliveryPeriod ?? ""
                                      }-${i}`}
                                    >
                                      <td className="col-party">
                                        <span className="party-dot">&bull;</span> {p.partyName}
                                      </td>
                                      <td className="col-qty">
                                        <strong>{formatNum(p.qty)}</strong> km
                                      </td>
                                      <td className="col-inhand">
                                        {inHandKm > 0 ? (
                                          <>
                                            <strong>
                                              {formatNum(inHandKm)}
                                            </strong>{" "}
                                            km
                                          </>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                      <td className="col-balance">
                                        <strong>
                                          {formatNum(partyBalance)}
                                        </strong>{" "}
                                        km
                                      </td>
                                      <td className="col-delivery">
                                        {formatDeliveryDisplay(
                                          p.deliveryPeriod,
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : null}

                        {deliveryDates.length > 0 &&
                        partyLines.every((p) => !p.deliveryPeriod) ? (
                          <p className="stock-status-card__orders-delivery">
                            <span className="stock-status-card__orders-label">
                              D.P.
                            </span>
                            <span className="stock-status-card__dash" aria-hidden>
                              {" "}
                              —{" "}
                            </span>
                            {deliveryDates
                              .map((d) => formatDeliveryDisplay(d))
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={listTotal}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
          />


        </>
      );
    })()}
        </div>
      )}
    </div>
  );
}
