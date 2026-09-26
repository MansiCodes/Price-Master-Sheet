import type ExcelJS from "exceljs";
import { PettyCashKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { iso, styleHeader, toNum, type DateFilter } from "./export-utils";

export async function fillPettyCashSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: Record<string, unknown>;
    byUser: Record<string, unknown>;
    dateFilter: DateFilter;
    cat6: boolean;
  },
) {
  const rows = await prisma.pettyCashEntry.findMany({
    where: {
      ...opts.pScope,
      ...opts.byUser,
      ...opts.dateFilter,
      entryType: PettyCashKind.PETTY_CASH,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  sheet.columns = opts.cat6
    ? [
        { header: "S.No", key: "sno", width: 8 },
        { header: "Date", key: "date", width: 12 },
        { header: "Output Amt", key: "amount", width: 14 },
        { header: "Nature of Expense", key: "nature", width: 28 },
        { header: "Expense Description", key: "desc", width: 44 },
        { header: "Person", key: "payMode", width: 16 },
        { header: "Location", key: "location", width: 18 },
        { header: "Check by", key: "checkedBy", width: 16 },
        { header: "Approved By", key: "approvedBy", width: 16 },
      ]
    : [
        { header: "S.No", key: "sno", width: 8 },
        { header: "Pay Mode", key: "payMode", width: 16 },
        { header: "Description of Expense", key: "desc", width: 44 },
        { header: "Bill Number", key: "billNumber", width: 22 },
        { header: "Bill Date", key: "date", width: 12 },
        { header: "Expenses", key: "amount", width: 14 },
        { header: "Contractor Salary", key: "contractorSalary", width: 18 },
        { header: "Supervisor Salary", key: "supervisorSalary", width: 18 },
        { header: "Total", key: "total", width: 14 },
      ];
  styleHeader(sheet.getRow(1));
  rows.forEach((r, i) => {
    sheet.addRow({
      sno: i + 1,
      payMode: r.payMode,
      nature: r.nature ?? "",
      desc: r.description ?? "",
      location: r.location ?? "",
      checkedBy: r.checkedBy ?? "",
      approvedBy: r.approvedBy ?? "",
      billNumber: r.billNumber ?? "",
      date: iso(r.date),
      amount: toNum(r.amount),
      contractorSalary: toNum(r.contractorSalary),
      supervisorSalary: toNum(r.supervisorSalary),
      total:
        toNum(r.amount) +
        toNum(r.contractorSalary) +
        toNum(r.supervisorSalary),
    });
  });
}

export async function fillExpenseSheet(
  sheet: ExcelJS.Worksheet,
  opts: {
    pScope: Record<string, unknown>;
    byUser: Record<string, unknown>;
    dateFilter: DateFilter;
    cat6: boolean;
  },
) {
  const rows = await prisma.pettyCashEntry.findMany({
    where: {
      ...opts.pScope,
      ...opts.byUser,
      ...opts.dateFilter,
      entryType: PettyCashKind.EXPENSE,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  sheet.columns = opts.cat6
    ? [
        { header: "S.No", key: "sno", width: 8 },
        { header: "Months", key: "date", width: 12 },
        { header: "Category", key: "head", width: 18 },
        { header: "Remarks", key: "desc", width: 24 },
        { header: "Salary Amt", key: "amount", width: 14 },
      ]
    : [
        { header: "sNo.", key: "sno", width: 8 },
        { header: "Date", key: "date", width: 12 },
        { header: "Shift", key: "shift", width: 10 },
        { header: "Category", key: "head", width: 18 },
        { header: "Remarks / notes", key: "desc", width: 36 },
        { header: "Opening reading", key: "opening", width: 16 },
        { header: "Closing reading", key: "closing", width: 16 },
        { header: "Amount", key: "amount", width: 14 },
      ];
  styleHeader(sheet.getRow(1));
  rows.forEach((r, i) => {
    sheet.addRow({
      sno: i + 1,
      date: iso(r.date),
      shift: r.shift,
      head: r.expenseHead,
      desc: r.description ?? "",
      opening:
        r.openingReading == null ? "" : toNum(r.openingReading),
      closing:
        r.closingReading == null ? "" : toNum(r.closingReading),
      amount:
        toNum(r.amount) +
        toNum(r.contractorSalary) +
        toNum(r.supervisorSalary),
    });
  });
}
