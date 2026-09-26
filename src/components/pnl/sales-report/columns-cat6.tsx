import { formatINR } from "@/lib/format/inr";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { formatDayMonthYear } from "@/lib/dates";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import {
  formatBillDate,
  formatQty,
  formatRate,
  goodsValue,
} from "@/components/pnl/sales-report/format";
import type { SaleRow } from "@/components/pnl/sales-report/types";

export function buildCat6SalesColumns(
  page: number,
  pageSize: number,
): ReportColumn<SaleRow>[] {
  return [
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
    {
      key: "excelUploadedAt",
      label: "Excel upload",
      compact: true,
      render: (r) =>
        r.excelUploadedAt ? formatDayMonthYear(r.excelUploadedAt) : "—",
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
        <BillPhotosCell urls={r.billPhotoUrls} fallbackUrl={r.billPhotoUrl} />
      ),
    },
  ];
}
