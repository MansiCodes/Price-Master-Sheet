"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectStockPhotoUrls } from "@/lib/bill-photos";
import {
  parseQuadSignalStockNotes,
  parseUpcastStockNotes,
} from "@/lib/plant-catalogs";
import { buildPvcStockColumns, buildCat6StockColumns } from "@/components/pnl/stock-report/columns-pvc";
import { buildDefaultStockColumns } from "@/components/pnl/stock-report/columns-default";
import {
  buildQuadRawStockColumns,
  buildQuadCableStockColumns,
} from "@/components/pnl/stock-report/columns-quad";
import { StockEditDrawer } from "@/components/pnl/stock-report/edit";
import type { StockRow } from "@/components/pnl/stock-report/types";

export function StockReport({
  plantId,
  plantCode,
  from,
  to,
  userRole,
  canMutate = true,
}: {
  plantId: string;
  plantCode?: string;
  from: string;
  to: string;
  userRole?: string;
  canMutate?: boolean;
}) {
  const t = useTranslations("pnl");
  const isPvc = plantCode?.toUpperCase() === "PVC";
  const isUpcast = plantCode?.toUpperCase() === "UPCAST";
  const cat6 = isCat6Plant(plantCode);
  const isQuadSignal = isQuadSignalPlant(plantCode);
  const [stockView, setStockView] = useState<"closing" | "atcl">("closing");
  const [quadKind, setQuadKind] = useState<"raw" | "cable">("raw");
  const baseUrl =
    `/api/plants/${plantId}/stock?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` +
    (isPvc
      ? stockView === "atcl"
        ? "&atcl=1"
        : "&snapshot=1"
      : "") +
    (isQuadSignal ? `&kind=${quadKind}` : "");
  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<StockRow>(baseUrl, t("networkError"), isPvc ? 20 : 10);
  const totals = response?.totals as
    | { closingValue?: number; quantity?: number }
    | undefined;
  const crud = useReportCrud<StockRow>(`/api/plants/${plantId}/stock`, reload);

  const actionCol: ReportColumn<StockRow> = {
    key: "actions",
    label: "Actions",
    compact: true,
    render: (r) => (
      <ReportRowActions
        onEdit={() => {
          const { meta, userNotes } = parseQuadSignalStockNotes(r.notes);
          const { meta: upcastMeta, userNotes: upcastUserNotes } = parseUpcastStockNotes(r.notes);
          const cableMeta = meta?.kind === "cable" ? meta : null;
          crud.openEdit(
            r,
            {
              date: toYmd(r.date),
              category: r.category ?? "",
              itemName: r.itemName ?? "",
              upcastOpening: upcastMeta ? String(upcastMeta.opening) : "",
              upcastIncoming: upcastMeta ? String(upcastMeta.incoming) : "",
              upcastOutward: upcastMeta ? String(upcastMeta.outward) : "",
              upcastTotalScrapWeight: upcastMeta?.totalScrapWeight != null ? String(upcastMeta.totalScrapWeight) : "",
              upcastPettyQty: upcastMeta?.pettyQty != null ? String(upcastMeta.pettyQty) : "",
              upcastWeightPerPetty: upcastMeta?.weightPerPetty != null ? String(upcastMeta.weightPerPetty) : "",
              upcastBurningLossWeight: upcastMeta?.burningLossWeight != null ? String(upcastMeta.burningLossWeight) : "",
              upcastRod8mmWeight: upcastMeta?.rod8mmWeight != null ? String(upcastMeta.rod8mmWeight) : "",
              upcastWire8mmTo1_6mmWeight: upcastMeta?.wire8mmTo1_6mmWeight != null ? String(upcastMeta.wire8mmTo1_6mmWeight) : "",
              upcastWire1_6mmWeight: upcastMeta?.wire1_6mmWeight != null ? String(upcastMeta.wire1_6mmWeight) : "",
              quantity: String(r.quantity ?? ""),
              unit: r.unit ?? "",
              rate: String(r.rate ?? ""),
              value: String(r.closingValue ?? ""),
              notes:
                isUpcast
                  ? upcastUserNotes
                  : isQuadSignal && quadKind === "cable"
                    ? userNotes
                    : (r.notes ?? ""),
              callPutup: cableMeta?.callPutup ?? "",
              putupDate: cableMeta?.putupDate ?? "",
              partyName: cableMeta?.partyName ?? "",
              dispatchPending:
                cableMeta?.dispatchPending != null
                  ? String(cableMeta.dispatchPending)
                  : "",
              dispatchParty: cableMeta?.dispatchParty ?? "",
            },
            collectStockPhotoUrls(r),
          );
        }}
        onDelete={() => void crud.remove(r.id)}
      />
    ),
  };

  const activeColumns = useMemo(() => {
    if (isPvc) return buildPvcStockColumns(page, pageSize);
    if (cat6) return buildCat6StockColumns(page, pageSize);
    if (isQuadSignal) {
      return quadKind === "raw"
        ? buildQuadRawStockColumns(page, pageSize)
        : buildQuadCableStockColumns(page, pageSize);
    }
    return buildDefaultStockColumns(isUpcast);
  }, [isPvc, cat6, isQuadSignal, quadKind, isUpcast, page, pageSize]);

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">
        {isPvc
          ? "PVC Plant — Closing Stock"
          : t("stockTitle")}
      </h3>
      {isQuadSignal ? (
        <div className="pnl-expense-subnav" role="tablist" aria-label="Stock kind">
          <button
            type="button"
            role="tab"
            aria-selected={quadKind === "raw"}
            className={quadKind === "raw" ? "is-active" : undefined}
            onClick={() => {
              setQuadKind("raw");
              setPage(1);
            }}
          >
            Raw Materials
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={quadKind === "cable"}
            className={quadKind === "cable" ? "is-active" : undefined}
            onClick={() => {
              setQuadKind("cable");
              setPage(1);
            }}
          >
            Cable
          </button>
        </div>
      ) : null}
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={canMutate ? [...activeColumns, actionCol] : activeColumns}
        rows={rows}
        loading={loading}
        variant="register"
        footer={
          totals && rows.length > 0
            ? isPvc
              ? {
                  particulars: "TOTAL",
                  closingValue: formatINR(totals.closingValue ?? 0),
                }
              : cat6
                ? { item: "TOTAL", value: formatINR(totals.closingValue ?? 0) }
                : { item: "TOTAL", value: formatINR(totals.closingValue ?? 0) }
            : undefined
        }
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <StockEditDrawer
        crud={crud}
        isPvc={isPvc}
        isUpcast={isUpcast}
        isQuadSignal={isQuadSignal}
        quadKind={quadKind}
      />
      {crud.deleteDialog}
    </section>
  );
}
