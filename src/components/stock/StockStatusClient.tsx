"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { todayDateString } from "@/lib/dates";
import {
  getQuadSignalCableSizes,
  QUAD_SIGNAL_STOCK_CABLES,
} from "@/lib/plant-catalogs";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import {
  formatProcessStatusLine,
  formatSharedInsulationLine,
  type CableStockStatusBlock,
  type SharedInsulationStatus,
} from "@/lib/stock-production-status";
import "@/components/ui/date-filter.css";
import "./stock-status.css";

function formatDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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
const CABLE_TYPE_OPTIONS = [ALL_CABLES, ...CABLE_TYPES];

type DisplayCard = {
  key: string;
  cable: string;
  size: string;
  block: CableStockStatusBlock | null;
};

export function StockStatusClient({
  date,
  tab,
  cableBlocks,
  sharedInsulation,
}: {
  date: string;
  tab: "cable" | "raw";
  cableBlocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
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

  const activeCable = CABLE_TYPE_OPTIONS.includes(cableType)
    ? cableType
    : ALL_CABLES;
  const showAllCables = activeCable === ALL_CABLES;

  const cablesInView = useMemo(
    () => (showAllCables ? [...CABLE_TYPES] : [activeCable]),
    [showAllCables, activeCable],
  );

  const catalogSizes = useMemo(() => {
    if (showAllCables) {
      const set = new Set<string>();
      for (const cable of CABLE_TYPES) {
        for (const s of getQuadSignalCableSizes(cable)) {
          if (s !== "Other") set.add(s);
        }
      }
      return Array.from(set);
    }
    return getQuadSignalCableSizes(activeCable).filter((s) => s !== "Other");
  }, [showAllCables, activeCable]);

  const sizeOptions = useMemo(
    () => [ALL_SIZES, ...catalogSizes],
    [catalogSizes],
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
    for (const cable of cablesInView) {
      const sizes = getQuadSignalCableSizes(cable).filter((s) => s !== "Other");
      for (const size of sizes) {
        if (cableSize !== ALL_SIZES && size !== cableSize) continue;
        const key = `${cable} · ${size}`;
        cards.push({
          key,
          cable,
          size,
          block: blocksByKey.get(key) ?? null,
        });
      }
    }

    // Filled data first, then empty. Within each group: Signalling → next cables,
    // then catalog size order.
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

      const sizes = getQuadSignalCableSizes(a.cable);
      return sizes.indexOf(a.size) - sizes.indexOf(b.size);
    });

    return cards;
  }, [cablesInView, cableSize, blocksByKey]);

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
        <div className="stock-status-placeholder">
          <h2>Raw Materials</h2>
          <p>Data for this section will be added later.</p>
        </div>
      ) : (
        <div className="stock-status-report">
          <div className="stock-status-filters form-grid two">
            <div className="field">
              <label htmlFor="stock-cable-type">Cable type</label>
              <SelectMenu
                id="stock-cable-type"
                value={activeCable}
                options={CABLE_TYPE_OPTIONS}
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

            {displayCards.map((card, idx) => {
              const block = card.block;
              return (
                <li
                  key={card.key}
                  className={`stock-status-card${block ? "" : " is-empty"}`}
                >
                  <h3 className="stock-status-card__size">
                    {idx + 1}- {card.size}
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
                      </ul>
                      <p className="stock-status-card__total">
                        Total — {block.totalKm}km
                      </p>
                      {block.salesKm > 0 ? (
                        <p className="stock-status-card__meta">
                          Sales — {block.salesKm}km
                        </p>
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
        </div>
      )}
    </div>
  );
}
