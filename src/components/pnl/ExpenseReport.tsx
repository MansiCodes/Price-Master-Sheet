"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { isCat6Plant } from "@/lib/plant-layout";
import {
  PVC_EXPENSE_SECTIONS,
  cat6ExpensePnlLine,
  expenseHeadLabelLines,
  expenseHeadTabLabel,
  getExpenseHeadsForSection,
  normalizePvcExpenseHead,
  pvcExpensePnlLine,
  upcastExpensePnlLine,
  UPCAST_MISC_NATURES,
  usesExpenseSections,
  type PvcExpenseSection,
} from "@/lib/plant-catalogs";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { EntryEditDrawer, toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectBillPhotoUrls } from "@/lib/bill-photos";
import { FixedAssetsReport } from "@/components/pnl/FixedAssetsReport";

type ExpenseRow = {
  id: string;
  date: string;
  shift: string;
  expenseHead: string;
  payMode?: string | null;
  nature?: string | null;
  description: string | null;
  location?: string | null;
  checkedBy?: string | null;
  approvedBy?: string | null;
  billNumber?: string | null;
  openingReading: string | number | null;
  closingReading: string | number | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
  excelUploadedAt?: string | null;
  approvedByHead?: boolean;
  approvedByAdmin?: boolean;
  approvalRequired?: boolean;
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
  userRole,
}: {
  plantId: string;
  plantCode?: string;
  from: string;
  to: string;
  userRole?: string;
}) {
  const t = useTranslations("pnl");
  const tCommon = useTranslations("common");
  const cat6 = isCat6Plant(plantCode);
  const pvc = plantCode?.toUpperCase() === "PVC";
  const upcast = plantCode?.toUpperCase() === "UPCAST";
  const usesSections = usesExpenseSections(plantCode);

  const [section, setSection] = useState<PvcExpenseSection>("direct");
  const sectionHeads = useMemo(
    () => [...getExpenseHeadsForSection(plantCode, section)],
    [plantCode, section],
  );
  const [category, setCategory] = useState(
    () =>
      getExpenseHeadsForSection(plantCode, "direct")[0] ??
      "Petty Cash",
  );
  const isPettyCategory = category === "Petty Cash";
  const isFarCategory = normalizePvcExpenseHead(category) === "FAR";
  const isUpcastMiscCategory = upcast && category === "Miscellaneous";

  const baseUrl = isPettyCategory
    ? `/api/plants/${plantId}/petty-cash?entryType=PETTY_CASH` +
      `&from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}`
    : isUpcastMiscCategory
      ? `/api/plants/${plantId}/petty-cash?` +
        `from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&expenseHeads=${encodeURIComponent(UPCAST_MISC_NATURES.join(","))}`
      : upcast
      ? `/api/plants/${plantId}/petty-cash?` +
        `from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&expenseHead=${encodeURIComponent(category)}`
      : `/api/plants/${plantId}/petty-cash?entryType=EXPENSE` +
        `&from=${encodeURIComponent(from)}` +
        `&to=${encodeURIComponent(to)}` +
        `&expenseHead=${encodeURIComponent(category)}`;
  const { rows, page, pageSize, total, loading, error, response, reload, setPage, setPageSize } =
    usePaginatedReport<ExpenseRow>(baseUrl, t("failedExpenses"), undefined, {
      enabled: !isFarCategory,
    });
  const totals = response?.totals as
    | { total?: number; expenses?: number }
    | undefined;
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
              key: "pnl",
              label: "P&L Line",
              wrap: true,
              render: (r) => cat6ExpensePnlLine(r.expenseHead),
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
              key: "excelUploadedAt",
              label: "Excel upload",
              compact: true,
              render: (r: ExpenseRow) =>
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
                <BillPhotosCell
                  urls={r.billPhotoUrls}
                  fallbackUrl={r.billPhotoUrl}
                />
              ),
            },
          ]
        : pvc || upcast
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
                render: (r) =>
                  upcast
                    ? upcastExpensePnlLine(r.expenseHead)
                    : pvcExpensePnlLine(r.expenseHead),
              },
              {
                key: "desc",
                label: t("remarksNotes"),
                wrap: "wide",
                render: (r) => r.description || tCommon("dash"),
              },
              {
                key: "amount",
                label: t("amount"),
                align: "right",
                render: (r) => formatINR(totalAmount(r)),
              },
              {
                key: "excelUploadedAt",
                label: "Excel upload",
                compact: true,
                render: (r) =>
                  r.excelUploadedAt
                    ? formatDayMonthYear(r.excelUploadedAt)
                    : "—",
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
                  <BillPhotosCell
                    urls={r.billPhotoUrls}
                    fallbackUrl={r.billPhotoUrl}
                  />
                ),
              },
            ]
          : [
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
                key: "desc",
                label: t("remarksNotes"),
                wrap: "wide",
                render: (r) => r.description || tCommon("dash"),
              },
              {
                key: "amount",
                label: t("amount"),
                align: "right",
                render: (r) => formatINR(totalAmount(r)),
              },
              {
                key: "excelUploadedAt",
                label: "Excel upload",
                compact: true,
                render: (r) =>
                  r.excelUploadedAt
                    ? formatDayMonthYear(r.excelUploadedAt)
                    : "—",
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
                  <BillPhotosCell
                    urls={r.billPhotoUrls}
                    fallbackUrl={r.billPhotoUrl}
                  />
                ),
              },
            ],
    [cat6, pvc, upcast, page, pageSize, t, tCommon],
  );

  const activeColumns = useMemo(() => columns, [columns]);

  const expenseEditFields = useMemo(() => {
    const base: Array<{
      name: string;
      label: string;
      type?: "text" | "number" | "date" | "textarea";
      required?: boolean;
    }> = [
      {
        name: "date",
        label: cat6 ? "Months" : t("date"),
        type: "date",
        required: true,
      },
      { name: "expenseHead", label: t("category"), required: true },
      {
        name: "description",
        label: cat6 ? "Remarks" : t("remarksNotes"),
        type: "textarea",
      },
    ];

    if (isPettyCategory) {
      base.push(
        { name: "payMode", label: "Pay Mode" },
        { name: "nature", label: "Nature" },
        { name: "location", label: "Location" },
        { name: "billNumber", label: "Bill Number" },
        {
          name: "contractorSalary",
          label: "Contractor Salary",
          type: "number",
        },
        {
          name: "supervisorSalary",
          label: "Supervisor Salary",
          type: "number",
        },
        {
          name: "amount",
          label: "Petty Cash Amount",
          type: "number",
          required: true,
        },
      );
    } else {
      base.push({
        name: "amount",
        label: cat6 ? "Salary Amt" : t("amount"),
        type: "number",
        required: true,
      });
      if (!cat6) {
        base.push(
          { name: "payMode", label: "Pay Mode" },
          { name: "nature", label: "Nature" },
          { name: "location", label: "Location" },
          { name: "billNumber", label: "Bill Number" },
          {
            name: "openingReading",
            label: "Opening Reading",
            type: "number",
          },
          {
            name: "closingReading",
            label: "Closing Reading",
            type: "number",
          },
        );
      }
    }

    return base;
  }, [cat6, isPettyCategory, t]);

  function onSectionChange(next: PvcExpenseSection) {
    setSection(next);
    const heads = [...getExpenseHeadsForSection(plantCode, next)];
    setCategory(heads[0] ?? "");
    setPage(1);
  }

  return (
    <section className="pnl-report-panel pnl-report-panel--expense">
      <h3 className="pnl-report-panel__title">{t("expenseTitle")}</h3>

      {usesSections ? (
        <div className="pnl-expense-navigation-group">
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

          {sectionHeads.length > 0 ? (
            <div
              className={`pnl-tab-nav ${
                sectionHeads.length <= 2
                  ? "pnl-expense-subnav-2"
                  : "pnl-tab-nav--compact pnl-expense-cat-nav-multi"
              }`}
              role="tablist"
              aria-label={
                section === "direct"
                  ? "Direct expense types"
                  : "Indirect expense types"
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
          ) : (
            <p className="pnl-expense-empty-hint">No categories in this section.</p>
          )}
        </div>
      ) : null}

      {error && !isFarCategory ? (
        <div className="alert alert--error">{error}</div>
      ) : null}

      {isFarCategory ? (
        <FixedAssetsReport plantId={plantId} from={from} to={to} />
      ) : (
        <>
          <ReportTable
            columns={[
              ...activeColumns,
              {
                key: "actions",
                label: "Actions",
                compact: true,
                render: (r) => (
                  <ReportRowActions
                    onEdit={() =>
                      crud.openEdit(
                        r,
                        {
                          date: toYmd(r.date),
                          expenseHead: r.expenseHead ?? "",
                          description: r.description ?? "",
                          amount: String(r.amount ?? ""),
                          contractorSalary: String(r.contractorSalary ?? "0"),
                          supervisorSalary: String(r.supervisorSalary ?? "0"),
                          payMode: r.payMode ?? "",
                          nature: r.nature ?? "",
                          location: r.location ?? "",
                          billNumber: r.billNumber ?? "",
                          openingReading:
                            r.openingReading == null
                              ? ""
                              : String(r.openingReading),
                          closingReading:
                            r.closingReading == null
                              ? ""
                              : String(r.closingReading),
                        },
                        collectBillPhotoUrls(r),
                      )
                    }
                    onDelete={() => void crud.remove(r.id)}
                  />
                ),
              },
            ]}
            rows={sectionHeads.length === 0 ? [] : rows}
            loading={loading}
            emptyLabel={t("noRecords")}
            variant={pvc || cat6 ? "register" : undefined}
            footer={
              totals && rows.length > 0 && sectionHeads.length > 0
                ? cat6
                  ? { s: "TOTAL", amount: formatINR(totals.total ?? 0) }
                  : { head: "TOTAL", amount: formatINR(totals.total ?? 0) }
                : undefined
            }
          />
          {sectionHeads.length > 0 ? (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null}
          <EntryEditDrawer
            open={Boolean(crud.editing)}
            title="Edit expense"
            fields={expenseEditFields}
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
                amount: Number(crud.values.amount || 0),
                payMode: crud.values.payMode || undefined,
                nature: crud.values.nature || null,
                location: crud.values.location || null,
                billNumber: crud.values.billNumber || null,
                contractorSalary: Number(crud.values.contractorSalary || 0),
                supervisorSalary: Number(crud.values.supervisorSalary || 0),
                openingReading: crud.values.openingReading
                  ? Number(crud.values.openingReading)
                  : null,
                closingReading: crud.values.closingReading
                  ? Number(crud.values.closingReading)
                  : null,
                billPhotoUrls: crud.photoUrls,
              })
            }
          />
        </>
      )}
      {crud.deleteDialog}
    </section>
  );
}
