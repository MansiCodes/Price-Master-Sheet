"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { todayDateString } from "@/lib/dates";
import {
  getQuadSignalCableSizes,
  QUAD_SIGNAL_STOCK_CABLES,
} from "@/lib/plant-catalogs";
import {
  formatProcessStatusLine,
  type CableStockStatusBlock,
} from "@/lib/stock-production-status";
import "@/components/ui/date-filter.css";
import "./stock-status.css";

function formatDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const ALL_SIZES = "All sizes";

const CABLE_TYPES = QUAD_SIGNAL_STOCK_CABLES.filter((c) => c !== "Other");

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
}: {
  date: string;
  tab: "cable" | "raw";
  cableBlocks: CableStockStatusBlock[];
}) {
  const router = useRouter();
  const today = todayDateString();
  const isToday = date === today;
  const dateInputRef = useRef<HTMLInputElement>(null);
  const emptyLabel = isToday
    ? "No data for today"
    : `No data for ${formatDisplayDate(date)}`;

  const [cableType, setCableType] = useState<string>(
    () => CABLE_TYPES[0] ?? "Signalling Cable",
  );
  const [cableSize, setCableSize] = useState(ALL_SIZES);

  const activeCable = CABLE_TYPES.includes(
    cableType as (typeof CABLE_TYPES)[number],
  )
    ? cableType
    : (CABLE_TYPES[0] ?? "Signalling Cable");

  const catalogSizes = useMemo(() => {
    return getQuadSignalCableSizes(activeCable).filter((s) => s !== "Other");
  }, [activeCable]);

  const sizeOptions = useMemo(
    () => [ALL_SIZES, ...catalogSizes],
    [catalogSizes],
  );

  const blocksBySize = useMemo(() => {
    const map = new Map<string, CableStockStatusBlock>();
    for (const b of cableBlocks) {
      if (b.cable !== activeCable) continue;
      if (!map.has(b.size)) map.set(b.size, b);
    }
    return map;
  }, [cableBlocks, activeCable]);

  const displayCards = useMemo((): DisplayCard[] => {
    const sizes =
      cableSize === ALL_SIZES
        ? catalogSizes
        : catalogSizes.includes(cableSize)
          ? [cableSize]
          : [];
    return sizes.map((size) => ({
      key: `${activeCable} · ${size}`,
      cable: activeCable,
      size,
      block: blocksBySize.get(size) ?? null,
    }));
  }, [activeCable, catalogSizes, cableSize, blocksBySize]);

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
      <header className="stock-status-page__head">
        <h1 className="page-title">Stock</h1>
      </header>

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
          <div className="pnl-date-filter">
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
                options={CABLE_TYPES}
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
            {displayCards.map((card, idx) => {
              const block = card.block;
              return (
                <li
                  key={card.key}
                  className={`stock-status-card${block ? "" : " is-empty"}`}
                >
                  <h3 className="stock-status-card__size">
                    {idx + 1}- {card.size}
                    <span className="stock-status-card__cable">
                      {" "}
                      · {card.cable}
                    </span>
                  </h3>

                  {block ? (
                    <>
                      {block.insulationNote ? (
                        <p className="stock-status-card__note">
                          {block.insulationNote}
                        </p>
                      ) : null}
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
                      <p className="stock-status-card__meta">
                        Closing stock as on {block.entryDate}
                        {block.entryDate !== date
                          ? ` · view date ${formatDisplayDate(date)}`
                          : ""}
                      </p>
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
