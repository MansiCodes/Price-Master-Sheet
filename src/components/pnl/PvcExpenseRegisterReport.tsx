"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import {
  PVC_EXPENSE_SECTIONS,
  expenseHeadLabelLines,
  expenseHeadTabLabel,
  getPvcExpenseHeadsForSection,
  pvcExpensePnlLine,
  pvcExpenseSection,
  type PvcExpenseSection,
} from "@/lib/plant-catalogs";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectBillPhotoUrls } from "@/lib/bill-photos";

type PvcExpenseRow = {
  id: string;
  expenseLabel: string;
  sortDate: string;
  periodLabel: string;
  description: string;
  details: string | null;
  amount: number;
  source: string;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

function pettyCashIdFromRegister(row: PvcExpenseRow): string | null {
  if (row.source !== "pettyCash") return null;
  const match = /^(?:petty|labour|salary)-(.+)$/.exec(row.id);
  return match?.[1] ?? null;
}

export function PvcExpenseRegisterReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const [section, setSection] = useState<PvcExpenseSection>("direct");
  const sectionHeads = useMemo(
    () => [...getPvcExpenseHeadsForSection(section)],
    [section],
  );
  const [category, setCategory] = useState<string>(
    sectionHeads[0] ?? "Fuel & Power",
  );

  const baseUrl = `/api/plants/${plantId}/pvc-expense-register?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&category=${encodeURIComponent(category)}`;

  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<PvcExpenseRow>(baseUrl, t("networkError"), 20);

  const totals = response?.totals as { amount?: number } | undefined;
  const crud = useReportCrud<PvcExpenseRow>(
    `/api/plants/${plantId}/petty-cash`,
    reload,
  );

  const columns: ReportColumn<PvcExpenseRow>[] = useMemo(
    () => [
      {
        key: "sno",
        label: "S No.",
        align: "center",
        compact: true,
        width: "4.5rem",
        render: (_r, index) =>
          String((page - 1) * pageSize + (index ?? 0) + 1),
      },
      {
        key: "section",
        label: "Section",
        width: "7rem",
        render: (r) =>
          pvcExpenseSection(r.expenseLabel) === "direct"
            ? "Direct"
            : "Indirect",
      },
      {
        key: "pnl",
        label: "P&L Line",
        wrap: true,
        width: "11rem",
        render: (r) => pvcExpensePnlLine(r.expenseLabel),
      },
      {
        key: "period",
        label: "Month / Date",
        width: "8rem",
        render: (r) => r.periodLabel,
      },
      {
        key: "desc",
        label: t("remarksNotes"),
        wrap: "wide",
        render: (r) => r.description,
      },
      {
        key: "details",
        label: "Details",
        wrap: "wide",
        render: (r) => r.details?.trim() || "—",
      },
      {
        key: "amount",
        label: t("amount"),
        align: "right",
        width: "11rem",
        render: (r) => formatINR(r.amount),
      },
    ],
    [page, pageSize, t],
  );

  function onSectionChange(next: PvcExpenseSection) {
    setSection(next);
    const heads = [...getPvcExpenseHeadsForSection(next)];
    setCategory(heads[0] ?? "");
    setPage(1);
  }

  return (
    <section className="pnl-report-panel pnl-report-panel--expense">
      <h3 className="pnl-report-panel__title">{t("expenseTitle")}</h3>

      <div
        className="pnl-tab-nav pnl-tab-nav--fit pnl-expense-type-nav"
        role="tablist"
        aria-label="Expense section"
      >
        {PVC_EXPENSE_SECTIONS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={section === entry.value}
            className={section === entry.value ? "is-active" : undefined}
            onClick={() => onSectionChange(entry.value)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div
        className={`pnl-tab-nav pnl-expense-cat-nav pnl-expense-cat-nav--cols-${sectionHeads.length}`}
        role="tablist"
        aria-label={
          section === "direct" ? "Direct expense types" : "Indirect expense types"
        }
      >
        {sectionHeads.map((head) => {
          const lines = expenseHeadLabelLines(head);
          const shortLabel = expenseHeadTabLabel(head);
          return (
            <button
              key={head}
              type="button"
              role="tab"
              aria-label={head}
              title={head}
              aria-selected={category === head}
              className={category === head ? "is-active" : undefined}
              onClick={() => {
                setCategory(head);
                setPage(1);
              }}
            >
              {lines ? (
                <>
                  <span className="pnl-expense-cat-label--full">{head}</span>
                  <span className="pnl-expense-cat-label--stacked pnl-tab-nav__stacked">
                    <span>{lines[0]}</span>
                    <span>{lines[1]}</span>
                  </span>
                </>
              ) : shortLabel !== head ? (
                <>
                  <span className="pnl-expense-cat-label--full">{head}</span>
                  <span className="pnl-expense-cat-label--short">
                    {shortLabel}
                  </span>
                </>
              ) : (
                head
              )}
            </button>
          );
        })}
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={[
          ...columns,
          {
            key: "actions",
            label: "Actions",
            compact: true,
            render: (r) => {
              const entryId = pettyCashIdFromRegister(r);
              if (!entryId) return "—";
              return (
                <ReportRowActions
                  onEdit={() =>
                    crud.openEdit(
                      { ...r, id: entryId },
                      {
                        date: toYmd(r.sortDate),
                        expenseHead: r.expenseLabel,
                        description: r.description ?? "",
                        amount: String(r.amount ?? ""),
                      },
                      collectBillPhotoUrls(r),
                    )
                  }
                  onDelete={() => void crud.remove(entryId)}
                />
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        emptyLabel={t("noRecords")}
        variant="register"
        footer={
          totals && rows.length > 0
            ? { pnl: "TOTAL", amount: formatINR(totals.amount ?? 0) }
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
          { name: "date", label: t("date"), type: "date", required: true },
          { name: "expenseHead", label: t("category"), required: true },
          { name: "description", label: t("remarksNotes"), type: "textarea" },
          { name: "amount", label: t("amount"), type: "number", required: true },
        ]}
        values={crud.values}
        saving={crud.saving}
        error={crud.error}
        onChange={crud.setField}
        onClose={crud.closeEdit}
        upload={{
          urls: crud.photoUrls,
          onChange: crud.setPhotoUrls,
          label: "Upload bill/document (optional)",
        }}
        onSave={() =>
          void crud.save({
            date: crud.values.date,
            expenseHead: crud.values.expenseHead,
            description: crud.values.description || null,
            amount: Number(crud.values.amount),
            billPhotoUrls: crud.photoUrls,
          })
        }
      />
      {crud.deleteDialog}
    </section>
  );
}
