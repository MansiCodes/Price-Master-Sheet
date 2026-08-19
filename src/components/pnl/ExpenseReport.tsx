"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { isCat6Plant } from "@/lib/plant-layout";
import { pvcExpensePnlLine } from "@/lib/plant-catalogs";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";

type ExpenseRow = {
  id: string;
  date: string;
  shift: string;
  expenseHead: string;
  description: string | null;
  openingReading: string | number | null;
  closingReading: string | number | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

function isoDate(value: string | Date) {
  return formatDayMonthYear(value);
}

function formatMonth(value: string | Date) {
  const iso = isoDate(value);
  if (!iso || iso === "—") return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function totalAmount(r: ExpenseRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function ExpenseReport({
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
  const tCommon = useTranslations("common");
  const cat6 = isCat6Plant(plantCode);
  const pvc = plantCode?.toUpperCase() === "PVC";
  const baseUrl = `/api/plants/${plantId}/petty-cash?entryType=EXPENSE&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<ExpenseRow>(baseUrl, t("failedExpenses"));
  const totals = response?.totals as { total?: number } | undefined;
  const crud = useReportCrud<ExpenseRow>(`/api/plants/${plantId}/petty-cash`, reload);

  const columns: ReportColumn<ExpenseRow>[] = useMemo(
    () =>
      cat6
        ? [
            {
              key: "s",
              label: "S.No",
              compact: true,
              render: (_r, index) =>
                String((page - 1) * pageSize + (index ?? 0) + 1),
            },
            {
              key: "month",
              label: "Months",
              render: (r) => formatMonth(r.date),
            },
            {
              key: "head",
              label: t("category"),
              render: (r) => r.expenseHead,
            },
            {
              key: "desc",
              label: "Remarks",
              wrap: "wide",
              render: (r) => r.description || tCommon("dash"),
            },
            {
              key: "amount",
              label: "Salary Amt",
              align: "right",
              render: (r) => formatINR(totalAmount(r)),
            },
            {
              key: "photos",
              label: "Bill",
              compact: true,
              render: (r) => (
                <BillPhotosCell
                  urls={r.billPhotoUrls}
                  fallbackUrl={r.billPhotoUrl}
                />
              ),
            },
          ]
        : pvc
          ? [
              {
                key: "s",
                label: "S.No",
                compact: true,
                render: (_r, index) =>
                  String((page - 1) * pageSize + (index ?? 0) + 1),
              },
              { key: "date", label: t("date"), render: (r) => isoDate(r.date) },
              { key: "head", label: t("category"), render: (r) => r.expenseHead },
              {
                key: "pnlLine",
                label: "P&L Line",
                wrap: true,
                render: (r) => pvcExpensePnlLine(r.expenseHead),
              },
              {
                key: "desc",
                label: t("remarksNotes"),
                wrap: "wide",
                render: (r) => r.description || tCommon("dash"),
              },
              {
                key: "opening",
                label: t("openingReading"),
                align: "right",
                compact: true,
                render: (r) =>
                  r.openingReading == null
                    ? tCommon("dash")
                    : String(r.openingReading),
              },
              {
                key: "closing",
                label: t("closingReading"),
                align: "right",
                compact: true,
                render: (r) =>
                  r.closingReading == null
                    ? tCommon("dash")
                    : String(r.closingReading),
              },
              {
                key: "amount",
                label: t("amount"),
                align: "right",
                render: (r) => formatINR(totalAmount(r)),
              },
              {
                key: "photos",
                label: "Bill",
                compact: true,
                render: (r) => (
                  <BillPhotosCell
                    urls={r.billPhotoUrls}
                    fallbackUrl={r.billPhotoUrl}
                  />
                ),
              },
            ]
          : [
            { key: "date", label: t("date"), render: (r) => isoDate(r.date) },
            { key: "shift", label: t("shift"), render: (r) => r.shift },
            { key: "head", label: t("category"), render: (r) => r.expenseHead },
            {
              key: "desc",
              label: t("remarksNotes"),
              wrap: "wide",
              render: (r) => r.description || tCommon("dash"),
            },
            {
              key: "opening",
              label: t("openingReading"),
              align: "right",
              render: (r) =>
                r.openingReading == null
                  ? tCommon("dash")
                  : String(r.openingReading),
            },
            {
              key: "closing",
              label: t("closingReading"),
              align: "right",
              render: (r) =>
                r.closingReading == null
                  ? tCommon("dash")
                  : String(r.closingReading),
            },
            {
              key: "amount",
              label: t("amount"),
              align: "right",
              render: (r) => formatINR(totalAmount(r)),
            },
            {
              key: "photos",
              label: "Bill",
              compact: true,
              render: (r) => (
                <BillPhotosCell
                  urls={r.billPhotoUrls}
                  fallbackUrl={r.billPhotoUrl}
                />
              ),
            },
          ],
    [cat6, pvc, page, pageSize, t, tCommon],
  );

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("expenseTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={[
          ...columns,
          {
            key: "actions",
            label: "Actions",
            compact: true,
            render: (r) => (
              <ReportRowActions
                onEdit={() =>
                  crud.openEdit(r, {
                    date: toYmd(r.date),
                    expenseHead: r.expenseHead ?? "",
                    description: r.description ?? "",
                    amount: String(r.amount ?? ""),
                    contractorSalary: String(r.contractorSalary ?? "0"),
                    supervisorSalary: String(r.supervisorSalary ?? "0"),
                  })
                }
                onDelete={() => void crud.remove(r.id)}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel={t("noRecords")}
        variant={pvc ? "register" : undefined}
        footer={
          totals
            ? cat6
              ? { month: "TOTAL", amount: formatINR(totals.total ?? 0) }
              : pvc
                ? { head: "TOTAL", amount: formatINR(totals.total ?? 0) }
                : { head: "TOTAL", amount: formatINR(totals.total ?? 0) }
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
        title="Edit expense"
        fields={[
          { name: "date", label: cat6 ? "Months" : "Date", type: "date", required: true },
          { name: "expenseHead", label: t("category"), required: true },
          { name: "description", label: cat6 ? "Remarks" : t("remarksNotes"), type: "textarea" },
          { name: "amount", label: cat6 ? "Salary Amt" : t("amount"), type: "number", required: true },
        ]}
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        onSave={() =>
          void crud.save({
            date: crud.values.date,
            expenseHead: crud.values.expenseHead,
            description: crud.values.description || null,
            amount: Number(crud.values.amount),
          })
        }
      />
      {crud.deleteDialog}
    </section>
  );
}
