"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { isCat6Plant } from "@/lib/plant-layout";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";

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
  inMeter?: string | number | null;
  qtyMtr?: string | number | null;
  meterUnit?: string | null;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

function formatBillDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
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
  const baseUrl = `/api/plants/${plantId}/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
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
          crud.openEdit(r, {
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
          })
        }
        onDelete={() => void crud.remove(r.id)}
      />
    ),
  };

  const pvcColumns: ReportColumn<SaleRow>[] = [
    {
      key: "s",
      label: "S No.",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
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

  const cat6Columns: ReportColumn<SaleRow>[] = [
    {
      key: "s",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "customer",
      label: "Customer Name",
      wrap: true,
      render: (r) => r.customerName,
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
      label: "Quantity",
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
      render: (r) => formatRate(r.rate),
    },
    {
      key: "sales",
      label: "Sales Value",
      align: "right",
      render: (r) => formatINR(Number(r.salesValue) || goodsValue(r)),
    },
    {
      key: "inMeter",
      label: "In Meter",
      align: "right",
      compact: true,
      render: (r) =>
        r.inMeter == null ? "—" : formatQty(r.inMeter),
    },
    {
      key: "qtyMtr",
      label: "QTY-MTR",
      align: "right",
      compact: true,
      render: (r) => (r.qtyMtr == null ? "—" : formatQty(r.qtyMtr)),
    },
    {
      key: "meterUnit",
      label: "Unit (MTR)",
      compact: true,
      render: (r) => r.meterUnit?.trim() || "—",
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("salesTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={[...(cat6 ? cat6Columns : pvcColumns), actionCol]}
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
                  remarks: "TOTAL",
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
      <EntryEditDrawer
        open={Boolean(crud.editing)}
        title="Edit sale"
        fields={
          cat6
            ? [
                { name: "date", label: "Bill Date", type: "date", required: true },
                { name: "customerName", label: "Customer Name", required: true },
                { name: "billNumber", label: "Bill Number" },
                { name: "itemDescription", label: "Item Details", required: true },
                { name: "quantity", label: "Quantity", type: "number", required: true },
                { name: "unit", label: "Unit", required: true },
                { name: "rate", label: "Rate", type: "number", required: true },
                { name: "inMeter", label: "In Meter", type: "number" },
                { name: "qtyMtr", label: "QTY-MTR", type: "number" },
                { name: "meterUnit", label: "Unit (MTR)" },
              ]
            : [
                { name: "date", label: "Bill date", type: "date", required: true },
                { name: "customerName", label: "Customer", required: true },
                { name: "billNumber", label: "Invoice no." },
                { name: "itemDescription", label: "Product name", required: true },
                { name: "quantity", label: "Qty", type: "number", required: true },
                { name: "unit", label: "Unit", required: true },
                { name: "rate", label: "Rate", type: "number", required: true },
                { name: "notes", label: "Remarks" },
              ]
        }
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        onSave={() =>
          void crud.save({
            date: crud.values.date,
            billDate: crud.values.date || null,
            customerName: crud.values.customerName,
            billNumber: crud.values.billNumber || null,
            itemDescription: crud.values.itemDescription,
            quantity: Number(crud.values.quantity),
            unit: crud.values.unit,
            rate: Number(crud.values.rate),
            inMeter: crud.values.inMeter ? Number(crud.values.inMeter) : null,
            qtyMtr: crud.values.qtyMtr ? Number(crud.values.qtyMtr) : null,
            meterUnit: crud.values.meterUnit || null,
            notes: crud.values.notes || null,
          })
        }
      />
      {crud.deleteDialog}
    </section>
  );
}
