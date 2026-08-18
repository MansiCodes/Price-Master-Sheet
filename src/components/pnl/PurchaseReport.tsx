"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";

type PurchaseRow = {
  id: string;
  date: string;
  billDate?: string | null;
  billNumber?: string | null;
  notes?: string | null;
  vendorName: string;
  itemDescription: string;
  quantity: string | number;
  unit: string;
  rate: string | number;
  basicValue: string | number;
  gstPercent: string | number;
  gstAmount: string | number;
  invoiceValue: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

function formatBillDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
}

function num(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: string | number) {
  return num(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PurchaseReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const baseUrl = `/api/plants/${plantId}/purchases?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, setPage, setPageSize } =
    usePaginatedReport<PurchaseRow>(baseUrl, t("failedPurchase"));

  const columns: ReportColumn<PurchaseRow>[] = [
    {
      key: "sno",
      label: "S No.",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "supplier",
      label: "Supplier name",
      wrap: true,
      render: (r) => r.vendorName,
    },
    {
      key: "description",
      label: "Description",
      wrap: true,
      render: (r) => r.itemDescription,
    },
    {
      key: "billNo",
      label: "Bill no.",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "unit",
      label: "Unit",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.quantity),
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.rate),
    },
    {
      key: "basic",
      label: "Basic value",
      align: "right",
      render: (r) => formatINR(num(r.basicValue) || num(r.quantity) * num(r.rate)),
    },
    {
      key: "gst",
      label: "GST",
      align: "right",
      headerAlign: "center",
      render: (r) => {
        const pct = num(r.gstPercent);
        const amt = num(r.gstAmount);
        return pct > 0 ? `${formatINR(amt)} @ ${pct}%` : formatINR(amt);
      },
    },
    {
      key: "invoice",
      label: "Invoice value",
      align: "right",
      render: (r) => formatINR(r.invoiceValue),
    },
    {
      key: "remarks",
      label: "Remarks",
      wrap: "wide",
      render: (r) => r.notes?.trim() || "—",
    },
    {
      key: "billDate",
      label: "Bill date",
      render: (r) => formatBillDate(r.billDate || r.date),
    },
    {
      key: "photos",
      label: "Bill",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.billPhotoUrls} fallbackUrl={r.billPhotoUrl} />
      ),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("purchaseTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant="register"
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}
