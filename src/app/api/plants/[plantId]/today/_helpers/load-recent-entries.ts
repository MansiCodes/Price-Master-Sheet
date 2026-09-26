import { prisma } from "@/lib/db";
import type { PlantIdFilter } from "@/lib/plant-merge";

type TodayEntryRow = {
  id: string;
  shift: string;
  kind: string;
  label: string;
  amount: number;
  createdAt: string;
};

export async function loadRecentEntries(
  entryWhere: PlantIdFilter & { date: Date; enteredById?: string },
) {
  const [purchaseRows, saleRows, stockRows, expenseRows] = await Promise.all([
    prisma.purchase.findMany({
      where: entryWhere,
      select: {
        id: true,
        shift: true,
        itemDescription: true,
        invoiceValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.sale.findMany({
      where: entryWhere,
      select: {
        id: true,
        shift: true,
        customerName: true,
        salesValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.stockEntry.findMany({
      where: entryWhere,
      select: {
        id: true,
        shift: true,
        itemName: true,
        closingValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.pettyCashEntry.findMany({
      where: { ...entryWhere, entryType: { in: ["EXPENSE", "PETTY_CASH"] } },
      select: {
        id: true,
        shift: true,
        expenseHead: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const recentEntries: TodayEntryRow[] = [
    ...purchaseRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Purchase",
      label: row.itemDescription,
      amount: Number(row.invoiceValue) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
    ...saleRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Sales",
      label: row.customerName,
      amount: Number(row.salesValue) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
    ...stockRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Stock",
      label: row.itemName,
      amount: Number(row.closingValue) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
    ...expenseRows.map((row) => ({
      id: row.id,
      shift: row.shift,
      kind: "Expense",
      label: row.expenseHead,
      amount: Number(row.amount) || 0,
      createdAt: row.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

  return recentEntries;
}
