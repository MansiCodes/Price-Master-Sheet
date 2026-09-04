"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { isCat6Plant } from "@/lib/plant-layout";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectBillPhotoUrls } from "@/lib/bill-photos";

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
  debitQuantity?: string | number | null;
  unit: string;
  rate: string | number;
  basicValue: string | number;
  gstPercent: string | number;
  gstAmount: string | number;
  invoiceValue: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
  approvedByHead?: boolean;
  approvedByAdmin?: boolean;
  approvalRequired?: boolean;
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
  const cat6 = isCat6Plant(plantCode);
  const isPvc = plantCode?.toUpperCase() === "PVC";
  const [purchaseView, setPurchaseView] = useState<"vendor" | "atcl">("vendor");
  const baseUrl =
    `/api/plants/${plantId}/purchases?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` +
    (purchaseView === "atcl" ? "&atclOnly=1" : "&excludeAtcl=1") +
    (cat6 && purchaseView === "vendor" ? "&excludeAtc=1" : "");
  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<PurchaseRow>(baseUrl, t("failedPurchase"));
  const totals = response?.totals as
    | {
        quantity?: number;
        basicValue?: number;
        gstAmount?: number;
        invoiceValue?: number;
        unloadingExpense?: number;
        unloadingRate?: number;
      }
    | undefined;
  const crud = useReportCrud<PurchaseRow>(`/api/plants/${plantId}/purchases`, reload);

  const actionCol: ReportColumn<PurchaseRow> = {
    key: "actions",
    label: "Actions",
    compact: true,
    render: (r) => (
      <ReportRowActions
        onEdit={() =>
          crud.openEdit(
            r,
            {
              date: toYmd(r.billDate || r.date),
              vendorName: r.vendorName ?? "",
              billNumber: r.billNumber ?? "",
              gstin: r.gstin ?? "",
              itemDescription: r.itemDescription ?? "",
              quantity: String(r.quantity ?? ""),
              debitQuantity:
                r.debitQuantity == null ? "" : String(r.debitQuantity),
              unit: r.unit ?? "",
              rate: String(r.rate ?? ""),
              gstPercent: String(r.gstPercent ?? "0"),
              notes: r.notes ?? "",
            },
            collectBillPhotoUrls(r),
          )
        }
        onDelete={() => void crud.remove(r.id)}
      />
    ),
  };

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

  const cat6Columns: ReportColumn<PurchaseRow>[] = [
    {
      key: "sno",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
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
      key: "debitQty",
      label: "Debit Qty",
      align: "right",
      compact: true,
      render: (r) =>
        num(r.debitQuantity ?? 0) > 0 ? formatQty(r.debitQuantity ?? 0) : "—",
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
      key: "debitAmt",
      label: "Debit Amt",
      align: "right",
      render: (r) =>
        num(r.debitQuantity ?? 0) > 0
          ? formatINR(num(r.debitQuantity ?? 0) * num(r.rate))
          : "—",
    },
    {
      key: "gross",
      label: "Basic value",
      align: "right",
      render: (r) => formatINR(num(r.quantity) * num(r.rate)),
    },
    {
      key: "amt",
      label: "Net value (after debit)",
      align: "right",
      render: (r) =>
        formatINR(num(r.basicValue) || (num(r.quantity) - num(r.debitQuantity ?? 0)) * num(r.rate)),
    },
    {
      key: "notes",
      label: "Notes",
      wrap: "wide",
      render: (r) => r.notes?.trim() || "—",
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

  const atclColumns: ReportColumn<PurchaseRow>[] = [
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

  /** Non-PVC / non-CAT6 plants (Upcast, Quad, etc.) — same fields as form. */
  const defaultColumns: ReportColumn<PurchaseRow>[] = [
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

  const activeColumns = useMemo(() => {
    if (cat6) return cat6Columns;
    if (purchaseView === "atcl") return atclColumns;
    if (isPvc) return pvcColumns;
    return defaultColumns;
  }, [cat6, isPvc, cat6Columns, atclColumns, pvcColumns, defaultColumns, purchaseView]);

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">
        {purchaseView === "atcl"
          ? "Stock Taken from ATCL"
          : t("purchaseTitle")}
      </h3>
      <div className="pnl-expense-subnav" role="tablist" aria-label="Purchase type">
        <button
          type="button"
          role="tab"
          aria-selected={purchaseView === "vendor"}
          className={purchaseView === "vendor" ? "is-active" : ""}
          onClick={() => {
            setPurchaseView("vendor");
            setPage(1);
          }}
        >
          Purchase from Vendor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={purchaseView === "atcl"}
          className={purchaseView === "atcl" ? "is-active" : ""}
          onClick={() => {
            setPurchaseView("atcl");
            setPage(1);
          }}
        >
          Stock Taken from ATCL
        </button>
      </div>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={[...activeColumns, actionCol]}
        rows={rows}
        loading={loading}
        variant="register"
        footer={
          totals && rows.length > 0
            ? cat6
              ? {
                  vendor: "TOTAL",
                  qty: formatQty(totals.quantity ?? 0),
                  amt: formatINR(totals.basicValue ?? 0),
                }
              : isPvc && purchaseView === "atcl"
                ? {
                    description: "TOTAL",
                    qty: formatQty(totals.quantity ?? 0),
                    basic: formatINR(totals.basicValue ?? 0),
                  }
                : isPvc
                  ? {
                      supplier: "Total Amount",
                      qty: formatQty(totals.quantity ?? 0),
                      netValue: formatINR(totals.basicValue ?? 0),
                      gst: formatINR(totals.gstAmount ?? 0),
                      invoice: formatINR(totals.invoiceValue ?? 0),
                      remarks: "—",
                    }
                  : {
                      supplier: "TOTAL",
                      qty: formatQty(totals.quantity ?? 0),
                      netValue: formatINR(totals.basicValue ?? 0),
                      gst: formatINR(totals.gstAmount ?? 0),
                      invoice: formatINR(totals.invoiceValue ?? 0),
                    }
            : undefined
        }
        secondaryFooter={
          totals && rows.length > 0 && isPvc && purchaseView === "vendor"
            ? {
                supplier: "Unloading/MT",
                rate: String(totals.unloadingRate ?? 70),
                basic: formatINR(totals.unloadingExpense ?? 0),
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
        title="Edit purchase"
        fields={
          cat6
            ? [
                { name: "date", label: "Bill Date", type: "date", required: true },
                { name: "gstin", label: "GSTIN/GST No" },
                { name: "vendorName", label: "Vendor's Name", required: true },
                { name: "billNumber", label: "Bill Number" },
                { name: "itemDescription", label: "Item Details", required: true },
                { name: "quantity", label: "Item QTY", type: "number", required: true },
                {
                  name: "debitQuantity",
                  label: "Debit Qty",
                  type: "number",
                },
                { name: "unit", label: "Unit", required: true },
                { name: "rate", label: "Rate", type: "number", required: true },
                { name: "notes", label: "Notes", type: "textarea" },
              ]
            : [
                { name: "date", label: "Bill date", type: "date", required: true },
                { name: "vendorName", label: "Supplier name", required: true },
                { name: "billNumber", label: "Invoice no. / Challan no." },
                { name: "itemDescription", label: "Description", required: true },
                { name: "quantity", label: "Qty", type: "number", required: true },
                {
                  name: "debitQuantity",
                  label: "Debit Qty",
                  type: "number",
                },
                { name: "unit", label: "Unit", required: true },
                { name: "rate", label: "Rate", type: "number", required: true },
                { name: "gstPercent", label: "GST %", type: "number" },
                { name: "notes", label: "Remarks", type: "textarea" },
              ]
        }
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        upload={{
          urls: crud.photoUrls,
          onChange: crud.setPhotoUrls,
          label: "Upload bill/challan (optional)",
        }}
        onSave={() =>
          void crud.save({
            date: crud.values.date,
            billDate: crud.values.date || null,
            booksDate: crud.values.date || null,
            vendorName: crud.values.vendorName,
            billNumber: crud.values.billNumber || null,
            gstin: crud.values.gstin || null,
            itemDescription: crud.values.itemDescription,
            quantity: Number(crud.values.quantity),
            debitQuantity: Number(crud.values.debitQuantity || 0),
            unit: crud.values.unit,
            rate: Number(crud.values.rate),
            gstPercent: Number(crud.values.gstPercent || 0),
            notes: crud.values.notes || null,
            billPhotoUrls: crud.photoUrls,
          })
        }
      >
        <div className="field">
          <label htmlFor="edit-debit-value">Debit Value</label>
          <input
            id="edit-debit-value"
            readOnly
            value={
              num(crud.values.debitQuantity || 0) > 0
                ? formatINR(
                    num(crud.values.debitQuantity || 0) *
                      num(crud.values.rate || 0),
                  )
                : "—"
            }
          />
        </div>
        <div className="field">
          <label htmlFor="edit-net-value">Net value (after debit)</label>
          <input
            id="edit-net-value"
            readOnly
            value={formatINR(
              Math.max(
                0,
                num(crud.values.quantity || 0) -
                  num(crud.values.debitQuantity || 0),
              ) * num(crud.values.rate || 0),
            )}
          />
        </div>
      </EntryEditDrawer>
      {crud.deleteDialog}
    </section>
  );
}
