"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { isCat6Plant } from "@/lib/plant-layout";

type PurchaseRow = {
  id: string;
  date: string;
  billDate?: string | null;
  billNumber?: string | null;
  gstin?: string | null;
  booksDate?: string | null;
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
  plantCode,
  from,
  to,
}: {
  plantId: string;
  plantCode?: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const cat6 = isCat6Plant(plantCode);
  const baseUrl = `/api/plants/${plantId}/purchases?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, response, setPage, setPageSize } =
    usePaginatedReport<PurchaseRow>(baseUrl, t("failedPurchase"));
  const totals = response?.totals as
    | { basicValue?: number; invoiceValue?: number }
    | undefined;

  const pvcColumns: ReportColumn<PurchaseRow>[] = [
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

  const cat6Columns: ReportColumn<PurchaseRow>[] = [
    {
      key: "sno",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "books",
      label: "Books",
      render: (r) => formatBillDate(r.booksDate),
    },
    {
      key: "gstin",
      label: "GSTIN/GST No",
      wrap: true,
      render: (r) => r.gstin?.trim() || "—",
    },
    {
      key: "vendor",
      label: "Vendor's Name",
      wrap: true,
      render: (r) => r.vendorName,
    },
    {
      key: "billNo",
      label: "Bill Number",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "billDate",
      label: "Bill Date",
      render: (r) => formatBillDate(r.billDate || r.date),
    },
    {
      key: "item",
      label: "Item Details",
      wrap: true,
      render: (r) => r.itemDescription,
    },
    {
      key: "qty",
      label: "Item QTY",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.quantity),
    },
    {
      key: "unit",
      label: "Unit",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.rate),
    },
    {
      key: "amt",
      label: "Purchase Amt",
      align: "right",
      render: (r) =>
        formatINR(num(r.basicValue) || num(r.quantity) * num(r.rate)),
    },
    {
      key: "notes",
      label: "Notes",
      wrap: "wide",
      render: (r) => r.notes?.trim() || "—",
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
        columns={cat6 ? cat6Columns : pvcColumns}
        rows={rows}
        loading={loading}
        variant="register"
        footer={
          totals
            ? cat6
              ? {
                  vendor: "TOTAL",
                  amt: formatINR(totals.basicValue ?? 0),
                }
              : {
                  supplier: "TOTAL",
                  invoice: formatINR(totals.invoiceValue ?? 0),
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
    </section>
  );
}
