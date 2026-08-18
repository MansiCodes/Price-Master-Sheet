"use client";

import { useTranslations } from "next-intl";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";

type ProductionRow = {
  id: string;
  date: string;
  shift: string;
  productName: string;
  quantity: string | number;
  unit: string;
};

function isoDate(value: string | Date) {
  return formatDayMonthYear(value);
}

export function ProductionReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const baseUrl = `/api/plants/${plantId}/production?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<ProductionRow>(baseUrl, t("networkError"));
  const totals = response?.totals as { quantity?: number } | undefined;
  const crud = useReportCrud<ProductionRow>(`/api/plants/${plantId}/production`, reload);

  const columns: ReportColumn<ProductionRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    { key: "shift", label: "Shift", render: (r) => r.shift },
    { key: "product", label: "Product", render: (r) => r.productName },
    {
      key: "qty",
      label: "Quantity",
      align: "right",
      render: (r) => `${Number(r.quantity)} ${r.unit}`,
    },
    {
      key: "actions",
      label: "Actions",
      compact: true,
      render: (r) => (
        <ReportRowActions
          onEdit={() =>
            crud.openEdit(r, {
              date: toYmd(r.date),
              productName: r.productName ?? "",
              quantity: String(r.quantity ?? ""),
              unit: r.unit ?? "",
            })
          }
          onDelete={() => void crud.remove(r.id)}
        />
      ),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("productionTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable columns={columns} rows={rows} loading={loading} footer={
          totals
            ? {
                product: "TOTAL",
                qty: Number(totals.quantity ?? 0).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                }),
              }
            : undefined
        } />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <EntryEditDrawer
        open={Boolean(crud.editing)}
        title="Edit production"
        fields={[
          { name: "date", label: "Date", type: "date", required: true },
          { name: "productName", label: "Product", required: true },
          { name: "quantity", label: "Quantity", type: "number", required: true },
          { name: "unit", label: "Unit", required: true },
        ]}
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        onSave={() =>
          void crud.save({
            date: crud.values.date,
            productName: crud.values.productName,
            quantity: Number(crud.values.quantity),
            unit: crud.values.unit,
          })
        }
      />
      {crud.deleteDialog}
    </section>
  );
}
