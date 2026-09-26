"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { isCat6Plant } from "@/lib/plant-layout";
import {
  getExpenseHeadsForSection,
  normalizePvcExpenseHead,
  UPCAST_MISC_NATURES,
  usesExpenseSections,
  type PvcExpenseSection,
} from "@/lib/plant-catalogs";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { toYmd } from "@/components/pnl/EntryEditDrawer";
import { useReportCrud } from "@/components/pnl/useReportCrud";
import { collectBillPhotoUrls } from "@/lib/bill-photos";
import { FixedAssetsReport } from "@/components/pnl/FixedAssetsReport";
import { electricityUnitsKwh } from "@/lib/electricity-readings";
import { buildExpenseColumns } from "@/components/pnl/expense-report/columns";
import { ExpenseSectionNav } from "@/components/pnl/expense-report/nav";
import {
  buildExpenseEditFields,
  ExpenseEditDrawer,
} from "@/components/pnl/expense-report/edit";
import { isElectricityExpenseHead } from "@/lib/electricity-readings";
import type { ExpenseRow } from "@/components/pnl/expense-report/types";

export function ExpenseReport({
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

  const columns = useMemo(
    () =>
      buildExpenseColumns({
        cat6,
        pvc,
        upcast,
        page,
        pageSize,
        t,
        tCommon,
      }),
    [cat6, pvc, upcast, page, pageSize, t, tCommon],
  );
  const activeColumns = useMemo(() => columns, [columns]);
  const editingElectricity = isElectricityExpenseHead(
    crud.values.expenseHead || category,
  );
  const expenseEditFields = useMemo(
    () =>
      buildExpenseEditFields({
        cat6,
        editingElectricity,
        isPettyCategory,
        t,
      }),
    [cat6, editingElectricity, isPettyCategory, t],
  );

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
        <ExpenseSectionNav
          section={section}
          sectionHeads={sectionHeads}
          category={category}
          onSectionChange={onSectionChange}
          onCategoryChange={(head) => {
            setCategory(head);
            setPage(1);
          }}
        />
      ) : null}

      {error && !isFarCategory ? (
        <div className="alert alert--error">{error}</div>
      ) : null}

      {isFarCategory ? (
        <FixedAssetsReport plantId={plantId} from={from} to={to} />
      ) : (
        <>
          <ReportTable
            columns={
              canMutate
                ? [
                    ...activeColumns,
                    {
                      key: "actions",
                      label: "Actions",
                      compact: true,
                      render: (r) => (
                        <ReportRowActions
                          onEdit={() => {
                            const ymd = toYmd(r.date);
                            const opening =
                              r.openingReading == null
                                ? ""
                                : String(r.openingReading);
                            const closing =
                              r.closingReading == null
                                ? ""
                                : String(r.closingReading);
                            const amountNum = Number(r.amount ?? 0);
                            const units = electricityUnitsKwh(
                              opening,
                              closing,
                            );
                            const rate =
                              units != null && units > 0 && amountNum > 0
                                ? String(
                                    Math.round((amountNum / units) * 10000) /
                                      10000,
                                  )
                                : "";
                            crud.openEdit(
                              r,
                              {
                                date: ymd,
                                month: ymd.slice(0, 7),
                                expenseHead: r.expenseHead ?? "",
                                description: r.description ?? "",
                                amount: String(r.amount ?? ""),
                                rate,
                                contractorSalary: String(
                                  r.contractorSalary ?? "0",
                                ),
                                supervisorSalary: String(
                                  r.supervisorSalary ?? "0",
                                ),
                                payMode: r.payMode ?? "Cash",
                                nature: r.nature ?? "",
                                location: r.location ?? "",
                                billNumber: r.billNumber ?? "",
                                openingReading: opening,
                                closingReading: closing,
                                shift: r.shift ?? "DAY",
                              },
                              collectBillPhotoUrls(r),
                            );
                          }}
                          onDelete={() => void crud.remove(r.id)}
                        />
                      ),
                    },
                  ]
                : activeColumns
            }
            rows={sectionHeads.length === 0 ? [] : rows}
            loading={loading}
            emptyLabel={t("noRecords")}
            variant="register"
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
          <ExpenseEditDrawer
            crud={crud}
            plantId={plantId}
            editingElectricity={editingElectricity}
            isPettyCategory={isPettyCategory}
            fields={expenseEditFields}
          />
        </>
      )}
      {crud.deleteDialog}
    </section>
  );
}
