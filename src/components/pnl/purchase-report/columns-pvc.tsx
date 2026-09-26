import { formatINR } from "@/lib/format/inr";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { formatDayMonthYear } from "@/lib/dates";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import { formatBillDate, formatQty, num } from "@/components/pnl/purchase-report/format";
import type { PurchaseRow } from "@/components/pnl/purchase-report/types";

export function buildPvcPurchaseColumns(
  page: number,
  pageSize: number,
): ReportColumn<PurchaseRow>[] {
  return [
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
      key: "billNo",
      label: "Invoice no. / Challan no.",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "description",
      label: "Description",
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
      key: "debitQty",
      label: "Debit Qty",
      align: "right",
      compact: true,
      render: (r) =>
        num(r.debitQuantity ?? 0) > 0 ? formatQty(r.debitQuantity ?? 0) : "—",
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.rate),
    },
    {
      key: "debitValue",
      label: "Debit Value",
      align: "right",
      render: (r) =>
        num(r.debitQuantity ?? 0) > 0
          ? formatINR(num(r.debitQuantity ?? 0) * num(r.rate))
          : "—",
    },
    {
      key: "basic",
      label: "Basic value",
      align: "right",
      render: (r) => formatINR(num(r.quantity) * num(r.rate)),
    },
    {
      key: "netValue",
      label: "Net value (after debit)",
      align: "right",
      render: (r) =>
        formatINR(
          num(r.basicValue) ||
            (num(r.quantity) - num(r.debitQuantity ?? 0)) * num(r.rate),
        ),
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
      label: "Bill",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.billPhotoUrls} fallbackUrl={r.billPhotoUrl} />
      ),
    },
  ];
}

export function buildAtclPurchaseColumns(
  page: number,
  pageSize: number,
): ReportColumn<PurchaseRow>[] {
  return [
    {
      key: "sno",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "description",
      label: "Items Details",
      wrap: true,
      render: (r) => r.itemDescription,
    },
    {
      key: "billNo",
      label: "Challan no. / Invoice no.",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "billDate",
      label: "Bill Date",
      render: (r) => formatBillDate(r.billDate || r.date),
    },
    {
      key: "unit",
      label: "Unit",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "qty",
      label: "Quantity",
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
      label: "Goods Value",
      align: "right",
      render: (r) => formatINR(num(r.basicValue) || num(r.quantity) * num(r.rate)),
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
