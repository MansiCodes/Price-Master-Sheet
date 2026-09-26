"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { todayDateString } from "@/lib/dates";
import {
  isQuadCableName,
  isSignallingCableName,
} from "@/lib/quad-signal-wip";
import type {
  CableStockStatusBlock,
  RawMaterialStockRow,
  SharedInsulationStatus,
} from "@/lib/stock-production-status";
import "@/components/ui/date-filter.css";
import "./stock-status.css";
import { StockCableCards } from "./StockCableCards";
import { StockRawTable } from "./StockRawTable";
import { StockStatusToolbar, useStockOrders } from "./StockStatusToolbar";
import {
  ALL_CABLES,
  ALL_SIZES,
  CABLE_TYPES,
  DEFAULT_PAGE_SIZE,
  blocksByDedupeKey,
  buildDisplayCards,
  catalogSizesForView,
  computeRawTotals,
  extraCablesFromBlocks,
  extraSizesFromData,
  formatDisplayDate,
} from "./stock-status-format";

export function StockStatusClient({
  plantId,
  date,
  tab,
  cableBlocks,
  sharedInsulation,
  quadInsulation = null,
  rawRows,
}: {
  plantId: string;
  date: string;
  tab: "cable" | "raw";
  cableBlocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
  quadInsulation?: SharedInsulationStatus | null;
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
  const [rmSearchQuery, setRmSearchQuery] = useState("");
  const orders = useStockOrders(plantId);

  const extraCablesFromData = useMemo(
    () => extraCablesFromBlocks(cableBlocks),
    [cableBlocks],
  );
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
      showAllCables ? [...CABLE_TYPES, ...extraCablesFromData] : [activeCable],
    [showAllCables, activeCable, extraCablesFromData],
  );
  const catalogSizes = useMemo(
    () => catalogSizesForView(showAllCables, activeCable),
    [showAllCables, activeCable],
  );
  const extraSizes = useMemo(
    () =>
      extraSizesFromData(
        cableBlocks,
        orders.ordersByKey,
        showAllCables,
        activeCable,
      ),
    [cableBlocks, orders.ordersByKey, showAllCables, activeCable],
  );
  const sizeOptions = useMemo(
    () => [ALL_SIZES, ...catalogSizes, ...extraSizes],
    [catalogSizes, extraSizes],
  );
  const blocksByKey = useMemo(
    () => blocksByDedupeKey(cableBlocks),
    [cableBlocks],
  );
  const displayCards = useMemo(
    () =>
      buildDisplayCards({
        cablesInView,
        cableSize,
        blocksByKey,
        cableBlocks,
        ordersByKey: orders.ordersByKey,
        showAllCables,
        activeCable,
      }),
    [
      cablesInView,
      cableSize,
      blocksByKey,
      cableBlocks,
      orders.ordersByKey,
      showAllCables,
      activeCable,
    ],
  );

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
  const rawTotals = useMemo(() => computeRawTotals(rawRows), [rawRows]);
  const showSignallingInsulation =
    showAllCables || isSignallingCableName(activeCable);
  const showQuadInsulation = showAllCables || isQuadCableName(activeCable);

  function changePageSize(next: number) {
    setPage(1);
    setPageSize(next);
  }

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
    <div className={`stock-status-page${orders.hasOrders ? " has-orders" : ""}`}>
      <StockStatusToolbar
        tab={tab}
        date={date}
        today={today}
        isToday={isToday}
        dateInputRef={dateInputRef}
        ordersFileRef={orders.ordersFileRef}
        ordersFileName={orders.ordersFileName}
        ordersUploading={orders.ordersUploading}
        onSetTab={setTab}
        onSetDate={setDate}
        onOpenCalendar={openCalendar}
        onOrdersExcelSelected={(file) => void orders.onOrdersExcelSelected(file)}
        onClearOrders={orders.clearOrders}
      />

      {tab === "raw" ? (
        <StockRawTable
          filteredRawRows={filteredRawRows}
          pagedRawRows={pagedRawRows}
          page={page}
          pageSize={pageSize}
          listTotal={listTotal}
          rawTotals={rawTotals}
          rmSearchQuery={rmSearchQuery}
          onSearchChange={(query) => {
            setRmSearchQuery(query);
            setPage(1);
          }}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      ) : (
        <StockCableCards
          pagedCards={pagedCards}
          page={page}
          pageSize={pageSize}
          listTotal={listTotal}
          emptyLabel={emptyLabel}
          ordersByKey={orders.ordersByKey}
          showSignallingInsulation={showSignallingInsulation}
          showQuadInsulation={showQuadInsulation}
          sharedInsulation={sharedInsulation}
          quadInsulation={quadInsulation}
          cableTypeOptions={cableTypeOptions}
          activeCable={activeCable}
          sizeOptions={sizeOptions}
          cableSize={cableSize}
          onCableTypeChange={(next) => {
            setCableType(next);
            setCableSize(ALL_SIZES);
          }}
          onCableSizeChange={setCableSize}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      )}
    </div>
  );
}
