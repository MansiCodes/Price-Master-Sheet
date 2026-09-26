import { formatINR } from "@/lib/format/inr";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { formatDayMonthYear } from "@/lib/dates";
import {
  cat6ExpensePnlLine,
  pvcExpensePnlLine,
  upcastExpensePnlLine,
} from "@/lib/plant-catalogs";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import {
  electricityUnitsKwh,
  isElectricityExpenseHead,
} from "@/lib/electricity-readings";
import {
  formatMonth,
  isoDate,
  totalAmount,
} from "@/components/pnl/expense-report/format";
import type { ExpenseRow } from "@/components/pnl/expense-report/types";

export function buildExpenseColumns(opts: {
  cat6: boolean;
  pvc: boolean;
  upcast: boolean;
  page: number;
  pageSize: number;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}): ReportColumn<ExpenseRow>[] {
  const { cat6, pvc, upcast, page, pageSize, t, tCommon } = opts;
  if (cat6) {
    return [
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
    ];
  }

  if (pvc || upcast) {
    return [
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
        key: "opening",
        label: "Opening",
        align: "right",
        render: (r) =>
          isElectricityExpenseHead(r.expenseHead) &&
          r.openingReading != null &&
          r.openingReading !== ""
            ? Number(r.openingReading).toLocaleString("en-IN")
            : tCommon("dash"),
      },
      {
        key: "closing",
        label: "Closing",
        align: "right",
        render: (r) =>
          isElectricityExpenseHead(r.expenseHead) &&
          r.closingReading != null &&
          r.closingReading !== ""
            ? Number(r.closingReading).toLocaleString("en-IN")
            : tCommon("dash"),
      },
      {
        key: "units",
        label: "Units (kWh)",
        align: "right",
        render: (r) => {
          if (!isElectricityExpenseHead(r.expenseHead)) {
            return tCommon("dash");
          }
          const units = electricityUnitsKwh(
            r.openingReading,
            r.closingReading,
          );
          return units == null
            ? tCommon("dash")
            : units.toLocaleString("en-IN");
        },
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
    ];
  }

  return [
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
  ];
}
