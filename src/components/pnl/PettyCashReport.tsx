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
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";

type PettyCashRow = {
  id: string;
  date: string;
  payMode: string;
  nature?: string | null;
  description: string | null;
  location?: string | null;
  checkedBy?: string | null;
  approvedBy?: string | null;
  billNumber: string | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

type PettyCashTotals = {
  expenses: number;
  contractorSalary: number;
  supervisorSalary: number;
  total: number;
};

function rowTotal(r: PettyCashRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function PettyCashReport({
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
  const baseUrl = `/api/plants/${plantId}/petty-cash?entryType=PETTY_CASH&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const {
    rows,
    page,
    pageSize,
    total,
    loading,
    error,
    response,
    reload,
    setPage,
    setPageSize,
  } =
    usePaginatedReport<PettyCashRow>(baseUrl, t("failedPettyCash"));
  const totals = response?.totals as PettyCashTotals | undefined;
  const crud = useReportCrud<PettyCashRow>(`/api/plants/${plantId}/petty-cash`, reload);

  const columns: ReportColumn<PettyCashRow>[] = useMemo(
    () => [
      {
        key: "s",
        label: t("sNo"),
        compact: true,
        render: (_r, index) =>
          String((page - 1) * pageSize + (index ?? 0) + 1),
      },
      {
        key: "payMode",
        label: t("payMode"),
        render: (r) => r.payMode || tCommon("dash"),
      },
      {
        key: "desc",
        label: t("descriptionOfExpense"),
        wrap: "wide",
        render: (r) => r.description?.trim() || tCommon("dash"),
      },
      {
        key: "billNumber",
        label: t("billNumber"),
        wrap: true,
        render: (r) => r.billNumber?.trim() || tCommon("dash"),
      },
      {
        key: "expenses",
        label: t("expenses"),
        align: "right",
        width: "10.5rem",
        render: (r) => formatINR(Number(r.amount)),
      },
      {
        key: "contractor",
        label: t("contractorSalary"),
        align: "right",
        width: "10.0rem",
        render: (r) => formatINR(Number(r.contractorSalary)),
      },
      {
        key: "supervisor",
        label: t("supervisorSalary"),
        align: "right",
        width: "10.0rem",
        render: (r) => formatINR(Number(r.supervisorSalary)),
      },
      {
        key: "total",
        label: t("total"),
        align: "right",
        width: "10.5rem",
        render: (r) => formatINR(rowTotal(r)),
      },
      {
        key: "billDate",
        label: t("billDate"),
        render: (r) => formatDayMonthYear(r.date),
      },
      {
        key: "photos",
        label: "Bill",
        compact: true,
        render: (r) => (
          <BillPhotosCell urls={r.billPhotoUrls} fallbackUrl={r.billPhotoUrl} />
        ),
      },
    ],
    [page, pageSize, t, tCommon],
  );

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("pettyCashTitle")}</h3>
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
                    payMode: r.payMode ?? "",
                    nature: r.nature ?? "",
                    description: r.description ?? "",
                    location: r.location ?? "",
                    amount: String(r.amount ?? ""),
                    contractorSalary: String(r.contractorSalary ?? "0"),
                    supervisorSalary: String(r.supervisorSalary ?? "0"),
                    billNumber: r.billNumber ?? "",
                  })
                }
                onDelete={() => void crud.remove(r.id)}
              />
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        variant="register"
        emptyLabel={t("noPettyCash")}
        footer={
          totals
            ? cat6
              ? {
                  // CAT6 uses the same table columns as PVC in this UI component.
                  // Footer keys must match `columns[]` keys, otherwise values render in wrong/empty cells.
                  desc: "Total Amount",
                  expenses: formatINR(totals.expenses),
                  contractor: formatINR(totals.contractorSalary),
                  supervisor: formatINR(totals.supervisorSalary),
                  total: formatINR(totals.total),
                }
              : {
                  desc: "Total Amount",
                  expenses: formatINR(totals.expenses),
                  contractor: formatINR(totals.contractorSalary),
                  supervisor: formatINR(totals.supervisorSalary),
                  total: formatINR(totals.total),
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
        title="Edit petty cash"
        fields={
          cat6
            ? [
                { name: "date", label: "Date", type: "date", required: true },
                { name: "amount", label: "Output Amt", type: "number", required: true },
                { name: "nature", label: "Nature of Expense" },
                { name: "description", label: "Expense Description", type: "textarea" },
                { name: "payMode", label: "Person", required: true },
                { name: "location", label: "Location" },
              ]
            : [
                { name: "date", label: t("billDate"), type: "date", required: true },
                { name: "payMode", label: t("payMode"), required: true },
                { name: "description", label: t("descriptionOfExpense"), type: "textarea" },
                { name: "billNumber", label: t("billNumber") },
                { name: "amount", label: t("expenses"), type: "number", required: true },
                { name: "contractorSalary", label: t("contractorSalary"), type: "number" },
                { name: "supervisorSalary", label: t("supervisorSalary"), type: "number" },
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
            payMode: crud.values.payMode,
            nature: crud.values.nature || null,
            description: crud.values.description || null,
            location: crud.values.location || null,
            amount: Number(crud.values.amount),
            contractorSalary: Number(crud.values.contractorSalary || 0),
            supervisorSalary: Number(crud.values.supervisorSalary || 0),
            billNumber: crud.values.billNumber || null,
          })
        }
      />
      {crud.deleteDialog}
    </section>
  );
}
