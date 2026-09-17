"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { Pagination } from "@/components/ui/Pagination";
import { todayDateString } from "@/lib/dates";
import {
  getQuadSignalCableSizes,
  QUAD_SIGNAL_STOCK_CABLES,
} from "@/lib/plant-catalogs";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import {
  formatCallPutupLine,
  formatDispatchLine,
  formatProcessStatusLine,
  formatSharedInsulationLine,
  type CableStockStatusBlock,
  type RawMaterialStockRow,
  type SharedInsulationStatus,
} from "@/lib/stock-production-status";
import "@/components/ui/date-filter.css";
import "./stock-status.css";

const DEFAULT_PAGE_SIZE = 10;

function formatDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 4,
  }).format(n);
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
  date,
  tab,
  cableBlocks,
  sharedInsulation,
  rawRows,
}: {
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
  const emptyLabel = isToday
    ? "No data for today"
    : `No data for ${formatDisplayDate(date)}`;

  const [cableType, setCableType] = useState(ALL_CABLES);
  const [cableSize, setCableSize] = useState(ALL_SIZES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  /** Custom sizes saved via form "Other" for the cables in view. */
  const extraSizesFromData = useMemo(() => {
    const set = new Set<string>();
    for (const b of cableBlocks) {
      if (!showAllCables && b.cable !== activeCable) continue;
      const known = new Set(catalogSizesForCable(b.cable));
      if (b.size && !known.has(b.size)) set.add(b.size);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cableBlocks, showAllCables, activeCable]);

  const sizeOptions = useMemo(
    () => [ALL_SIZES, ...catalogSizes, ...extraSizesFromData],
    [catalogSizes, extraSizesFromData],
  );

  const blocksByKey = useMemo(() => {
    const map = new Map<string, CableStockStatusBlock>();
    for (const b of cableBlocks) {
      map.set(`${b.cable} · ${b.size}`, b);
    }
    return map;
  }, [cableBlocks]);

  const displayCards = useMemo((): DisplayCard[] => {
    const cards: DisplayCard[] = [];
    const seen = new Set<string>();

    for (const cable of cablesInView) {
      const sizes = catalogSizesForCable(cable);
      for (const size of sizes) {
        if (cableSize !== ALL_SIZES && size !== cableSize) continue;
        const key = `${cable} · ${size}`;
        seen.add(key);
        cards.push({
          key,
          cable,
          size,
          block: blocksByKey.get(key) ?? null,
        });
      }
    }

    // Entries saved with size/cable "Other" use the typed custom name —
    // include those so they appear on Stock (catalog loop alone misses them).
    for (const b of cableBlocks) {
      const key = `${b.cable} · ${b.size}`;
      if (seen.has(key)) continue;
      if (!showAllCables && b.cable !== activeCable) continue;
      if (cableSize !== ALL_SIZES && b.size !== cableSize) continue;
      seen.add(key);
      cards.push({
        key,
        cable: b.cable,
        size: b.size,
        block: b,
      });
    }

    // Filled data first, then empty. Within each group: Signalling → next cables,
    // then catalog size order (custom sizes after catalog).
    cards.sort((a, b) => {
      const aHas = a.block ? 0 : 1;
      const bHas = b.block ? 0 : 1;
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

  const pagedRawRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rawRows.slice(start, start + pageSize);
  }, [rawRows, page, pageSize]);

  const listTotal = tab === "raw" ? rawRows.length : displayCards.length;

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

  return (
    <div className="stock-status-page">
      <div className="stock-status-toolbar">
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
      </div>

      {tab === "raw" ? (
        <div className="stock-status-report">
          <div className="stock-rm-table-wrap">
            <table className="stock-rm-table">
              <thead>
                <tr>
                  <th scope="col">S. No.</th>
                  <th scope="col">Item</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Rate</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {pagedRawRows.map((row, idx) => (
                  <tr
                    key={row.item}
                    className={row.hasData ? undefined : "is-empty"}
                  >
                    <td>{(page - 1) * pageSize + idx + 1}</td>
                    <td>{row.item}</td>
                    <td>
                      {row.hasData && row.qty != null
                        ? formatNum(row.qty)
                        : "—"}
                    </td>
                    <td>{row.hasData ? row.unit || "—" : "—"}</td>
                    <td>
                      {row.hasData && row.rate != null
                        ? formatNum(row.rate)
                        : "—"}
                    </td>
                    <td>
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
                    <td>
                      {rawTotals.qty != null ? formatNum(rawTotals.qty) : "—"}
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td>
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

          <ol className="stock-status-grid">
            {showInsulationCard ? (
              <li
                className={`stock-status-card stock-status-card--insulation${
                  sharedInsulation ? "" : " is-empty"
                }`}
              >
                <h3 className="stock-status-card__size">
                  Insulation
                  <span className="stock-status-card__cable">
                    {" "}
                    · Signalling Cable
                  </span>
                </h3>
                {sharedInsulation ? (
                  <>
                    <ul className="stock-status-card__procs">
                      <li>
                        {formatSharedInsulationLine(sharedInsulation)}
                      </li>
                    </ul>
                    {sharedInsulation.consumed > 0 ? (
                      <p className="stock-status-card__meta">
                        Consumed — {sharedInsulation.consumed}km
                      </p>
                    ) : null}
                    <p className="stock-status-card__total">
                      Closing — {sharedInsulation.closing}km
                    </p>
                  </>
                ) : (
                  <p className="stock-status-card__empty">{emptyLabel}</p>
                )}
              </li>
            ) : null}

            {pagedCards.map((card, idx) => {
              const block = card.block;
              const putupLine = block
                ? formatCallPutupLine({
                    putupKm: block.putupKm ?? 0,
                    callPutup: block.callPutup ?? "",
                    putupDate: block.putupDate
                      ? formatDisplayDate(block.putupDate)
                      : "",
                    partyName: block.partyName ?? "",
                  })
                : null;
              const dispatchLine = block
                ? formatDispatchLine({
                    partyName: block.partyName ?? "",
                    dispatchParty: block.dispatchParty ?? "",
                    dispatchPending: block.dispatchPending ?? 0,
                  })
                : null;
              return (
                <li
                  key={card.key}
                  className={`stock-status-card${block ? "" : " is-empty"}`}
                >
                  <h3 className="stock-status-card__size">
                    <span className="stock-status-card__sno">
                      ({(page - 1) * pageSize + idx + 1})
                    </span>{" "}
                    <span className="stock-status-card__name">{card.size}</span>
                    {showAllCables ? (
                      <span className="stock-status-card__cable">
                        {" "}
                        · {card.cable}
                      </span>
                    ) : null}
                  </h3>

                  {block ? (
                    <>
                      <ul className="stock-status-card__procs">
                        {block.processes.map((p) => (
                          <li key={p.name}>{formatProcessStatusLine(p)}</li>
                        ))}
                        {putupLine ? (
                          <li key="call-putup">{putupLine}</li>
                        ) : null}
                      </ul>
                      <p className="stock-status-card__total">
                        Total — {block.totalKm}km
                      </p>
                      {dispatchLine ? (
                        <ul className="stock-status-card__procs stock-status-card__procs--after-total">
                          <li>{dispatchLine}</li>
                        </ul>
                      ) : null}
                      {block.userNotes ? (
                        <p className="stock-status-card__notes">
                          {block.userNotes}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="stock-status-card__empty">{emptyLabel}</p>
                  )}
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
        </div>
      )}
    </div>
  );
}
