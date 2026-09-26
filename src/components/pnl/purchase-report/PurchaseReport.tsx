"use client";

import { useState, useMemo } from "react";
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
import { buildAtclPurchaseColumns, buildPvcPurchaseColumns } from "@/components/pnl/purchase-report/columns-pvc";
import { buildCat6PurchaseColumns, buildDefaultPurchaseColumns } from "@/components/pnl/purchase-report/columns-default";
import { PurchaseEditDrawer } from "@/components/pnl/purchase-report/edit";
import { formatQty } from "@/components/pnl/purchase-report/format";
import type { PurchaseRow } from "@/components/pnl/purchase-report/types";

export function PurchaseReport({
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

  const activeColumns = useMemo(() => {
    if (cat6) return buildCat6PurchaseColumns(page, pageSize);
    if (purchaseView === "atcl") return buildAtclPurchaseColumns(page, pageSize);
    if (isPvc) return buildPvcPurchaseColumns(page, pageSize);
    return buildDefaultPurchaseColumns(page, pageSize);
  }, [cat6, isPvc, purchaseView, page, pageSize]);

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">
        {purchaseView === "atcl"
          ? "Stock Taken from ATCL"
          : t("purchaseTitle")}
      </h3>
      <div
        className="pnl-expense-subnav pnl-purchase-source-nav"
        role="tablist"
        aria-label="Purchase type"
      >
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
          <span className="pnl-purchase-source-label--full">
            Purchase from Vendor
          </span>
          <span className="pnl-tab-nav__stacked pnl-purchase-source-label--stacked">
            <span>Purchase from</span>
            <span>Vendor</span>
          </span>
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
          <span className="pnl-purchase-source-label--full">
            Stock Taken from ATCL
          </span>
          <span className="pnl-tab-nav__stacked pnl-purchase-source-label--stacked">
            <span>Stock Taken</span>
            <span>from ATCL</span>
          </span>
        </button>
      </div>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={canMutate ? [...activeColumns, actionCol] : activeColumns}
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
      <PurchaseEditDrawer crud={crud} cat6={cat6} />
      {crud.deleteDialog}
    </section>
  );
}
