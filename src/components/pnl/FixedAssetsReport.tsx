"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";

type FixedAssetRow = {
  id: string;
  assetDescription: string;
  vendor: string | null;
  billNumber: string | null;
  billDate: string | null;
  cost: number;
  depreciationPercent: number;
};

function iso(d: string | null) {
  return formatDayMonthYear(d);
}

function daysInclusive(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  const ms = end - start;
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function FixedAssetsReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");

  const baseUrl = `/api/plants/${plantId}/fixed-assets?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}`;

  const { rows, page, pageSize, total, loading, error, setPage, setPageSize } =
    usePaginatedReport<FixedAssetRow>(baseUrl, t("networkError"));

  const periodDays = useMemo(() => {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 1;
    return daysInclusive(fromDate, toDate);
  }, [from, to]);

  const columns: ReportColumn<FixedAssetRow>[] = useMemo(
    () => [
      {
        key: "sno",
        label: t("sNo"),
        compact: true,
        render: (_r, index) => String((page - 1) * pageSize + (index ?? 0) + 1),
      },
      {
        key: "desc",
        label: "Asset description",
        wrap: true,
        render: (r) => r.assetDescription,
      },
      {
        key: "vendor",
        label: "Vendor",
        wrap: true,
        render: (r) => r.vendor ?? "—",
      },
      {
        key: "bill",
        label: "Bill no.",
        render: (r) => r.billNumber ?? "—",
      },
      {
        key: "billDate",
        label: "Bill date",
        render: (r) => iso(r.billDate),
      },
      {
        key: "cost",
        label: "Cost",
        align: "right",
        render: (r) => formatINR(Number(r.cost)),
      },
      {
        key: "depPct",
        label: "Dep %",
        align: "right",
        render: (r) => `${Number(r.depreciationPercent).toFixed(2)}%`,
      },
      {
        key: "depAmt",
        label: "Depreciation Amt",
        align: "right",
        render: (r) => {
          const annual = Number(r.cost) * (Number(r.depreciationPercent) / 100);
          const depAmt = (annual * periodDays) / 365;
          return formatINR(depAmt);
        },
      },
    ],
    [page, pageSize, t, periodDays],
  );

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">FAR</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable columns={columns} rows={rows} loading={loading} variant="register" />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}

