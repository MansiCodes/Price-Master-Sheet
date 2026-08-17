"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import {
  REPORT_PAGE_SIZE,
  usePaginatedReport,
} from "@/components/pnl/usePaginatedReport";

type SaleRow = {
  id: string;
  date: string;
  billDate?: string | null;
  billNumber?: string | null;
  notes?: string | null;
  customerName: string;
  itemDescription: string;
  quantity: string | number;
  unit: string;
  rate: string | number;
  salesValue: string | number;
};

function isoDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function formatBillDate(value: string | Date | null | undefined) {
  const iso = isoDate(value);
  if (iso === "—") return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function formatQty(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRate(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function goodsValue(row: SaleRow) {
  const qty = Number(row.quantity);
  const rate = Number(row.rate);
  if (Number.isFinite(qty) && Number.isFinite(rate)) {
    return qty * rate;
  }
  return Number(row.salesValue) || 0;
}

export function SalesReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const baseUrl = `/api/plants/${plantId}/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, total, loading, error, setPage } =
    usePaginatedReport<SaleRow>(baseUrl, t("failedSales"));

  const columns: ReportColumn<SaleRow>[] = [
    {
      key: "s",
      label: "S No.",
      render: (_r, index) =>
        String((page - 1) * REPORT_PAGE_SIZE + (index ?? 0) + 1),
    },
    {
      key: "remarks",
      label: "Remarks",
      wrap: "wide",
      render: (r) => r.notes?.trim() || "—",
    },
    {
      key: "invoice",
      label: "Invoice no.",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "billDate",
      label: "Bill date",
      render: (r) => formatBillDate(r.billDate || r.date),
    },
    {
      key: "product",
      label: "Product name",
      wrap: true,
      render: (r) => r.itemDescription,
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
      render: (r) => formatRate(r.rate),
    },
    {
      key: "goods",
      label: "Goods value",
      align: "right",
      render: (r) => formatINR(goodsValue(r)),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("salesTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant="register"
      />
      <Pagination
        page={page}
        pageSize={REPORT_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </section>
  );
}
