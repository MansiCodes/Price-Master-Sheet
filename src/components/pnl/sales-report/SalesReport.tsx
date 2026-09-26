"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { isCat6Plant } from "@/lib/plant-layout";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectBillPhotoUrls } from "@/lib/bill-photos";
import { buildCat6SalesColumns } from "@/components/pnl/sales-report/columns-cat6";
import { buildPvcSalesColumns } from "@/components/pnl/sales-report/columns-pvc";
import { SalesEditDrawer } from "@/components/pnl/sales-report/edit";
import type { SaleRow } from "@/components/pnl/sales-report/types";

export function SalesReport({
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
  const cat6 = isCat6Plant(plantCode);
  const isPvc = plantCode?.toUpperCase() === "PVC";
  // CAT6 Sales tab mirrors Sales-NF sheet (SUM J3:J504). P&L adds online + extra rows separately.
  const baseUrl = isPvc
    ? `/api/plants/${plantId}/sales?register=1&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : `/api/plants/${plantId}/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<SaleRow>(baseUrl, t("failedSales"));
  const totals = response?.totals as
    | { salesValue?: number; quantity?: number }
    | undefined;
  const crud = useReportCrud<SaleRow>(`/api/plants/${plantId}/sales`, reload);

  const actionCol: ReportColumn<SaleRow> = {
    key: "actions",
    label: "Actions",
    compact: true,
    width: "8.75rem",
    render: (r) => (
      <ReportRowActions
        onEdit={() =>
          crud.openEdit(
            r,
            {
              date: toYmd(r.billDate || r.date),
              customerName: r.customerName ?? "",
              billNumber: r.billNumber ?? "",
              itemDescription: r.itemDescription ?? "",
              quantity: String(r.quantity ?? ""),
              unit: r.unit ?? "",
              rate: String(r.rate ?? ""),
              inMeter: r.inMeter == null ? "" : String(r.inMeter),
              qtyMtr: r.qtyMtr == null ? "" : String(r.qtyMtr),
              meterUnit: r.meterUnit ?? "",
              notes: r.notes ?? "",
            },
            collectBillPhotoUrls(r),
          )
        }
        onDelete={() => void crud.remove(r.id)}
      />
    ),
  };

  const pvcColumns = buildPvcSalesColumns(page, pageSize);
  const cat6Columns = buildCat6SalesColumns(page, pageSize);

  const activeColumns = useMemo(() => {
    return cat6 ? cat6Columns : pvcColumns;
  }, [cat6, cat6Columns, pvcColumns]);

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("salesTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={canMutate ? [...activeColumns, actionCol] : activeColumns}
        rows={rows}
        loading={loading}
        variant="register"
        footer={
          totals
            ? cat6
              ? {
                  customer: "TOTAL",
                  sales: formatINR(totals.salesValue ?? 0),
                }
              : {
                  customer: "TOTAL",
                  goods: formatINR(totals.salesValue ?? 0),
                }
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
      <SalesEditDrawer crud={crud} cat6={cat6} />
      {crud.deleteDialog}
    </section>
  );
}
