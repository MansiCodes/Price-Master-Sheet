"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { formatMonthLabel } from "@/lib/dates";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";

type ElectricityRentRow = {
  id: string;
  month: string;
  openingReading: number | string | null;
  closingReading: number | string | null;
  consumedUnits: number | string | null;
  billAmount: number;
  rentAmount: number;
  coveredAreaSqft?: number | string | null;
  rentRatePerSqft?: number | string | null;
  notes: string | null;
};

function num(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatReading(value: number | string | null | undefined) {
  const n = num(value);
  if (n == null) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function avgRate(row: ElectricityRentRow) {
  const consumed = num(row.consumedUnits);
  const bill = num(row.billAmount) ?? 0;
  if (consumed != null && consumed > 0 && bill > 0) {
    return bill / consumed;
  }
  return null;
}

function coveredAreaLabel(row: ElectricityRentRow) {
  const area = num(row.coveredAreaSqft);
  if (area == null) return "—";
  return `${area.toLocaleString("en-IN")} SQFT`;
}

export function ElectricityRentReport({
  plantId,
  plantCode,
  from,
  to,
  section = "combined",
}: {
  plantId: string;
  plantCode?: string;
  from: string;
  to: string;
  section?: "electricity" | "factoryRent" | "combined";
}) {
  const t = useTranslations("pnl");
  const isPvc = plantCode?.toUpperCase() === "PVC";
  const isFactoryRent = section === "factoryRent";
  const rangeFrom = isFactoryRent ? "2026-01-01" : from;
  const rangeTo = isFactoryRent ? "2027-03-31" : to;
  const baseUrl = `/api/plants/${plantId}/electricity-rent?from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(rangeTo)}${isFactoryRent ? "&register=1" : ""}`;

  const { rows, page, pageSize, total, loading, error, setPage, setPageSize } =
    usePaginatedReport<ElectricityRentRow>(
      baseUrl,
      t("networkError"),
      isPvc || isFactoryRent ? 20 : 10,
    );

  const electricityColumns: ReportColumn<ElectricityRentRow>[] = useMemo(
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
        key: "month",
        label: "Months",
        width: "7rem",
        render: (r) => formatMonthLabel(r.month),
      },
      {
        key: "opening",
        label: "Opening Reading",
        align: "right",
        width: "9rem",
        render: (r) => formatReading(r.openingReading),
      },
      {
        key: "closing",
        label: "Closing Reading",
        align: "right",
        width: "9rem",
        render: (r) => formatReading(r.closingReading),
      },
      {
        key: "consumed",
        label: "Consumed Reading",
        align: "right",
        width: "9.5rem",
        render: (r) => formatReading(r.consumedUnits),
      },
      {
        key: "avg",
        label: "Avg rate",
        align: "right",
        compact: true,
        width: "7rem",
        render: (r) => {
          const rate = avgRate(r);
          return rate == null ? "—" : formatReading(rate);
        },
      },
      {
        key: "bill",
        label: "Amount of electricity bill",
        align: "right",
        width: "12rem",
        render: (r) => (num(r.billAmount) ? formatINR(r.billAmount) : "—"),
      },
      {
        key: "notes",
        label: "Notes / Remark",
        wrap: "wide",
        render: (r) => r.notes?.trim() || "—",
      },
    ],
    [page, pageSize],
  );

  const rentColumns: ReportColumn<ElectricityRentRow>[] = useMemo(
    () => [
      {
        key: "sno",
        label: "S.No",
        align: "center",
        compact: true,
        width: "4.5rem",
        render: (_r, index) =>
          String((page - 1) * pageSize + (index ?? 0) + 1),
      },
      {
        key: "month",
        label: "Months",
        width: "8rem",
        render: (r) => formatMonthLabel(r.month),
      },
      {
        key: "area",
        label: "Covered Area",
        align: "right",
        width: "10rem",
        render: (r) => coveredAreaLabel(r),
      },
      {
        key: "rate",
        label: "Rate",
        align: "right",
        width: "7rem",
        render: (r) => formatReading(r.rentRatePerSqft),
      },
      {
        key: "rent",
        label: "Rent Exp",
        align: "right",
        width: "10rem",
        render: (r) => (num(r.rentAmount) ? formatINR(r.rentAmount) : "—"),
      },
    ],
    [page, pageSize],
  );

  const combinedColumns: ReportColumn<ElectricityRentRow>[] = useMemo(
    () => [
      {
        key: "month",
        label: "Months",
        render: (r) => formatMonthLabel(r.month),
      },
      {
        key: "bill",
        label: "Electricity Amount",
        align: "right",
        render: (r) => formatINR(r.billAmount),
      },
      {
        key: "rent",
        label: "Rent Amount",
        align: "right",
        render: (r) => formatINR(r.rentAmount),
      },
      {
        key: "notes",
        label: "Notes",
        wrap: "wide",
        render: (r) => r.notes?.trim() || "—",
      },
    ],
    [],
  );

  const title =
    section === "factoryRent"
      ? "Factory Rent"
      : section === "electricity"
        ? "Electricity"
        : "Rent & Electricity";

  const columns =
    section === "factoryRent"
      ? rentColumns
      : section === "electricity"
        ? electricityColumns
        : combinedColumns;

  return (
    <section className="pnl-report-panel">
      <h3
        className={`pnl-report-panel__title${
          section === "factoryRent" ? " pnl-report-panel__title--plain" : ""
        }`}
      >
        {title}
      </h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant={section === "combined" ? "default" : "register"}
      />
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
