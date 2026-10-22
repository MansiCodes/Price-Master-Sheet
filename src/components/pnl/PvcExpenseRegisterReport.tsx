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
import { DeleteConfirmDialog } from "@/components/pnl/DeleteConfirmDialog";
import { collectBillPhotoUrls } from "@/lib/bill-photos";
import { deleteJson, patchJson } from "@/lib/client-forms";
import { toast } from "sonner";

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

type RowEntityInfo = {
  rawId: string;
  source: "pettyCash" | "fixedAsset" | "electricityRent";
  field?: "rent" | "bill";
};

function getRowEntityInfo(row: PvcExpenseRow): RowEntityInfo | null {
  if (row.source === "pettyCash") {
    const match = /^(?:petty|labour|salary)-(.+)$/.exec(row.id);
    return match ? { rawId: match[1], source: "pettyCash" } : null;
  }
  if (row.source === "fixedAsset") {
    const match = /^far-(.+)$/.exec(row.id);
    return match ? { rawId: match[1], source: "fixedAsset" } : null;
  }
  if (row.source === "electricityRent") {
    const match = /^elec-(rent|bill)-(.+)$/.exec(row.id);
    return match
      ? {
          rawId: match[2],
          source: "electricityRent",
          field: match[1] as "rent" | "bill",
        }
      : null;
  }
  return null;
}

export function PvcExpenseRegisterReport({
  plantId,
  from,
  to,
  canMutate = true,
}: {
  plantId: string;
  from: string;
  to: string;
  canMutate?: boolean;
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

  // Universal CRUD state for all expense types (petty cash, fixed assets, electricity/rent)
  const [editingRow, setEditingRow] = useState<PvcExpenseRow | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingDeleteRow, setPendingDeleteRow] = useState<PvcExpenseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDeleteRow || deleting) return;
    const info = getRowEntityInfo(pendingDeleteRow);
    if (!info) return;

    setDeleting(true);
    let url = "";
    if (info.source === "pettyCash") {
      url = `/api/plants/${plantId}/petty-cash?id=${encodeURIComponent(info.rawId)}&confirm=true`;
    } else if (info.source === "fixedAsset") {
      url = `/api/plants/${plantId}/fixed-assets?id=${encodeURIComponent(info.rawId)}`;
    } else if (info.source === "electricityRent") {
      url = `/api/plants/${plantId}/electricity-rent?id=${encodeURIComponent(info.rawId)}&field=${info.field}`;
    }

    const result = await deleteJson(url, { confirm: true });
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Entry deleted");
    setPendingDeleteRow(null);
    reload();
  }

  async function saveEdit() {
    if (!editingRow || saving) return;
    const info = getRowEntityInfo(editingRow);
    if (!info) return;

    setSaving(true);
    setEditError(null);

    let result;
    if (info.source === "pettyCash") {
      result = await patchJson(`/api/plants/${plantId}/petty-cash`, {
        id: info.rawId,
        date: editValues.date,
        expenseHead: editValues.expenseHead,
        description: editValues.description || null,
        amount: Number(editValues.amount),
        billPhotoUrls: photoUrls,
      });
    } else if (info.source === "fixedAsset") {
      result = await patchJson(`/api/plants/${plantId}/fixed-assets`, {
        id: info.rawId,
        date: editValues.date,
        description: editValues.description || null,
        amount: Number(editValues.amount),
      });
    } else if (info.source === "electricityRent") {
      result = await patchJson(`/api/plants/${plantId}/electricity-rent`, {
        id: info.rawId,
        field: info.field,
        amount: Number(editValues.amount),
        description: editValues.description || null,
      });
    }

    setSaving(false);
    if (!result || !result.ok) {
      setEditError(result?.error ?? "Save failed");
      return;
    }
    toast.success("Entry updated");
    setEditingRow(null);
    reload();
  }

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

        <div
          className={`pnl-tab-nav pnl-expense-cat-nav pnl-expense-cat-nav--cols-${sectionHeads.length}`}
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
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={
          canMutate
            ? [
                ...columns,
                {
                  key: "actions",
                  label: "Actions",
                  compact: true,
                  render: (r) => {
                    const info = getRowEntityInfo(r);
                    if (!info) return "—";
                    return (
                      <ReportRowActions
                        onEdit={() => {
                          setEditingRow(r);
                          setEditValues({
                            date: toYmd(r.sortDate),
                            expenseHead: r.expenseLabel,
                            description: r.description ?? "",
                            amount: String(r.amount ?? ""),
                          });
                          setPhotoUrls(collectBillPhotoUrls(r));
                          setEditError(null);
                        }}
                        onDelete={() => setPendingDeleteRow(r)}
                      />
                    );
                  },
                },
              ]
            : columns
        }
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
        open={Boolean(editingRow)}
        title={`Edit ${editingRow?.expenseLabel ?? "expense"}`}
        fields={[
          { name: "date", label: t("date"), type: "date", required: true },
          { name: "expenseHead", label: t("category"), required: true },
          { name: "description", label: t("remarksNotes"), type: "textarea" },
          { name: "amount", label: t("amount"), type: "number", required: true },
        ]}
        values={editValues}
        saving={saving}
        error={editError}
        onChange={(name, val) =>
          setEditValues((prev) => ({ ...prev, [name]: val }))
        }
        onClose={() => setEditingRow(null)}
        upload={{
          urls: photoUrls,
          onChange: setPhotoUrls,
          label: "Upload bill/document (optional)",
        }}
        onSave={() => void saveEdit()}
      />
      <DeleteConfirmDialog
        open={Boolean(pendingDeleteRow)}
        deleting={deleting}
        onNo={() => setPendingDeleteRow(null)}
        onYes={() => void confirmDelete()}
        title={`Delete ${pendingDeleteRow?.expenseLabel ?? "entry"}?`}
        message={`Are you sure you want to delete this ${pendingDeleteRow?.expenseLabel ?? "expense"} record (${pendingDeleteRow?.description ?? ""})? This cannot be undone.`}
      />
    </section>
  );
}
