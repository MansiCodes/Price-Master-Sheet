"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { isCat6Plant } from "@/lib/plant-layout";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectStockPhotoUrls } from "@/lib/bill-photos";
import { PVC_STOCK_ENTRY_TYPES } from "@/lib/plant-catalogs";

type StockRow = {
  id: string;
  date: string;
  notes?: string | null;
  itemName: string;
  category?: string | null;
  quantity: string | number;
  unit: string;
  rate?: string | number | null;
  closingValue: string | number;
  photoUrl?: string | null;
  photoUrls?: string[];
  approvedByHead?: boolean;
  approvedByAdmin?: boolean;
  approvalRequired?: boolean;
};

function isoDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
}

function num(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: string | number, digits = 2) {
  return num(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function StockReport({
  plantId,
  plantCode,
  from,
  to,
  userRole,
}: {
  plantId: string;
  plantCode?: string;
  from: string;
  to: string;
  userRole?: string;
}) {
  const t = useTranslations("pnl");
  const isPvc = plantCode?.toUpperCase() === "PVC";
  const cat6 = isCat6Plant(plantCode);
  const [stockView, setStockView] = useState<"closing" | "atcl">("closing");
  const baseUrl =
    `/api/plants/${plantId}/stock?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` +
    (isPvc
      ? stockView === "atcl"
        ? "&atcl=1"
        : "&snapshot=1"
      : "");
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
        onEdit={() =>
          crud.openEdit(
            r,
            {
              date: toYmd(r.date),
              category: r.category ?? "",
              itemName: r.itemName ?? "",
              quantity: String(r.quantity ?? ""),
              unit: r.unit ?? "",
              rate: String(r.rate ?? ""),
              value: String(r.closingValue ?? ""),
              notes: r.notes ?? "",
            },
            collectStockPhotoUrls(r),
          )
        }
        onDelete={() => void crud.remove(r.id)}
      />
    ),
  };

  const pvcColumns: ReportColumn<StockRow>[] = [
    {
      key: "sno",
      label: "S.No.",
      align: "center",
      compact: true,
      width: "4.5rem",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "date",
      label: "Date",
      align: "center",
      compact: true,
      width: "6.5rem",
      render: (r) => isoDate(r.date),
    },
    {
      key: "stock",
      label: "Stock",
      align: "center",
      compact: true,
      width: "5rem",
      render: (r) => r.category || "RM",
    },
    {
      key: "particulars",
      label: "Particulars",
      wrap: true,
      render: (r) => r.itemName,
    },
    {
      key: "closingStock",
      label: "Closing Stock",
      align: "right",
      width: "9rem",
      render: (r) => formatQty(r.quantity, 3),
    },
    {
      key: "unit",
      label: "Unit",
      align: "center",
      compact: true,
      width: "5rem",
      render: (r) => r.unit || "KGS",
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      width: "7rem",
      render: (r) => formatQty(num(r.rate)),
    },
    {
      key: "closingValue",
      label: "Closing Value",
      align: "right",
      width: "10rem",
      render: (r) =>
        formatINR(num(r.closingValue) || num(r.quantity) * num(r.rate)),
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
    },
    {
      key: "photos",
      label: "Image",
      align: "center",
      compact: true,
      width: "5.5rem",
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];

  const defaultColumns: ReportColumn<StockRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    { key: "item", label: "Item", render: (r) => r.itemName },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      render: (r) => `${Number(r.quantity)} ${r.unit}`,
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      render: (r) => formatINR(r.closingValue),
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
    },
    {
      key: "photos",
      label: "Image",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];

  const cat6Columns: ReportColumn<StockRow>[] = [
    {
      key: "s",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "date",
      label: "Date",
      align: "center",
      compact: true,
      render: (r) => isoDate(r.date),
    },
    {
      key: "item",
      label: "Item Name",
      wrap: true,
      render: (r) => r.itemName,
    },
    {
      key: "qty",
      label: "QTY",
      align: "right",
      compact: true,
      render: (r) => String(Number(r.quantity)),
    },
    {
      key: "unit",
      label: "UNIT",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "rate",
      label: "RATE",
      align: "right",
      compact: true,
      render: (r) =>
        num(r.rate).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      render: (r) => formatINR(r.closingValue),
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
    },
    {
      key: "photos",
      label: "Image",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];

  const activeColumns = useMemo(() => {
    return isPvc ? pvcColumns : cat6 ? cat6Columns : defaultColumns;
  }, [isPvc, pvcColumns, cat6, cat6Columns, defaultColumns]);

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">
        {isPvc
          ? "PVC Plant — Closing Stock"
          : t("stockTitle")}
      </h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={[
          ...activeColumns,
          actionCol,
        ]}
        rows={rows}
        loading={loading}
        variant={isPvc || cat6 ? "register" : undefined}
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
      <EntryEditDrawer
        open={Boolean(crud.editing)}
        title="Edit stock"
        fields={[
          { name: "date", label: "Date", type: "date", required: true },
          ...(isPvc
            ? [{ name: "category", label: "Stock (RM/FG)", required: true }]
            : []),
          { name: "itemName", label: isPvc ? "Particulars" : "Item Name", required: true },
          { name: "quantity", label: isPvc ? "Closing Stock" : "QTY", type: "number", required: true },
          { name: "unit", label: "Unit", required: true },
          { name: "rate", label: "Rate", type: "number", required: true },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        upload={{
          urls: crud.photoUrls,
          onChange: crud.setPhotoUrls,
          label: "Upload stock images (optional)",
        }}
        onSave={() => {
          const qty = Number(crud.values.quantity) || 0;
          const rate = Number(crud.values.rate) || 0;
          void crud.save({
            date: crud.values.date,
            ...(isPvc ? { category: crud.values.category || null } : {}),
            itemName: crud.values.itemName,
            quantity: qty,
            unit: crud.values.unit,
            rate: rate,
            value: qty * rate,
            notes: crud.values.notes || null,
            photoUrls: crud.photoUrls,
          });
        }}
      />
      {crud.deleteDialog}
    </section>
  );
}
