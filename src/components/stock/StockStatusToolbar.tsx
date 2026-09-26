"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import type { StockOrderBySize } from "@/lib/stock/order-excel-types";
import { formatDisplayDate } from "./stock-status-format";

export function useStockOrders(plantId: string) {
  const ordersFileRef = useRef<HTMLInputElement>(null);
  const [ordersByKey, setOrdersByKey] = useState<Record<
    string,
    StockOrderBySize
  > | null>(null);
  const [ordersFileName, setOrdersFileName] = useState<string | null>(null);
  const [ordersUploading, setOrdersUploading] = useState(false);
  const [ordersHydrated, setOrdersHydrated] = useState(false);
  const ordersStorageKey = `stock-orders-excel:v2:${plantId}`;

  useEffect(() => {
    let ignore = false;
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

    fetch(`/api/plants/${plantId}/stock/orders-excel`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { byKey?: Record<string, StockOrderBySize> } | null) => {
        if (ignore || !data?.byKey) return;
        if (Object.keys(data.byKey).length > 0) {
          setOrdersByKey(data.byKey);
        }
      })
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

  async function onOrdersExcelSelected(file: File | null) {
    if (!file) return;
    setOrdersUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/plants/${plantId}/stock/orders-excel`, {
        method: "POST",
        body,
      });
      const json = (await res.json()) as {
        error?: string;
        byKey?: Record<string, StockOrderBySize>;
        matchedRows?: number;
        unmatchedSizes?: string[];
        fileName?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
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
    fetch(`/api/plants/${plantId}/stock/orders-excel`, { method: "DELETE" }).catch(
      () => {},
    );
  }

  return {
    ordersFileRef,
    ordersByKey,
    ordersFileName,
    ordersUploading,
    onOrdersExcelSelected,
    clearOrders,
    hasOrders: Boolean(ordersByKey && Object.keys(ordersByKey).length > 0),
  };
}

export function CalendarIcon() {
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

export function StockStatusToolbar({
  tab,
  date,
  today,
  isToday,
  dateInputRef,
  ordersFileRef,
  ordersFileName,
  ordersUploading,
  onSetTab,
  onSetDate,
  onOpenCalendar,
  onOrdersExcelSelected,
  onClearOrders,
}: {
  tab: "cable" | "raw";
  date: string;
  today: string;
  isToday: boolean;
  dateInputRef: RefObject<HTMLInputElement | null>;
  ordersFileRef: RefObject<HTMLInputElement | null>;
  ordersFileName: string | null;
  ordersUploading: boolean;
  onSetTab: (tab: "cable" | "raw") => void;
  onSetDate: (date: string) => void;
  onOpenCalendar: () => void;
  onOrdersExcelSelected: (file: File | null) => void;
  onClearOrders: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="stock-status-toolbar">
      <div className="stock-status-toolbar__top-row">
        <div className="stock-status-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "cable"}
            className={`stock-status-tabs__btn${tab === "cable" ? " is-active" : ""}`}
            onClick={() => onSetTab("cable")}
          >
            Cable
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "raw"}
            className={`stock-status-tabs__btn${tab === "raw" ? " is-active" : ""}`}
            onClick={() => onSetTab("raw")}
          >
            Raw Materials
          </button>
        </div>

        <div
          className="stock-status-toolbar__date"
          aria-label="Stock as of date"
          title="Shows the latest stock filled for this date. If a size was filled on an earlier day and not filled again, that earlier fill still shows."
        >
          <span className={`stock-status-today-pill${isToday ? " is-today" : ""}`}>
            {isToday ? "Today" : formatDisplayDate(date)}
          </span>
          <button
            type="button"
            className="stock-status-cal-btn"
            aria-label="Choose stock date"
            onClick={onOpenCalendar}
          >
            <CalendarIcon />
          </button>
          <div className="pnl-date-filter stock-status-date-full">
            <div className="pnl-date-filter__field">
              <label htmlFor="stock-date" className="sr-only">
                Stock as of date
              </label>
              <div className="pnl-date-filter__input-wrap">
                <input
                  ref={dateInputRef}
                  id="stock-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => onSetDate(e.target.value)}
                  onClick={onOpenCalendar}
                  aria-label="Stock as of date — the day the stock form was filled for"
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
                onClick={() => setConfirmClear(true)}
                title={ordersFileName}
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {confirmClear ? (
        <div className="stock-confirm-dialog" role="presentation">
          <button
            type="button"
            className="stock-confirm-dialog__backdrop"
            aria-label="No"
            onClick={() => setConfirmClear(false)}
          />
          <div
            className="stock-confirm-dialog__panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="stock-clear-title"
          >
            <h2 id="stock-clear-title" className="stock-confirm-dialog__title">
              Clear uploaded file?
            </h2>
            <p className="stock-confirm-dialog__copy">
              Are you sure you want to clear the uploaded files?
            </p>
            <div className="stock-confirm-dialog__actions">
              <button
                type="button"
                className="stock-confirm-dialog__no"
                onClick={() => setConfirmClear(false)}
              >
                No
              </button>
              <button
                type="button"
                className="stock-confirm-dialog__yes"
                onClick={() => {
                  setConfirmClear(false);
                  onClearOrders();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
