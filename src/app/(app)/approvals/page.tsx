import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { dateOnlyRegex, parseDateOnly } from "@/lib/dates";
import {
  canApproveEntries,
  getAccessiblePlantIds,
  hasGlobalPlantAccess,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { getPlantDisplayName } from "@/lib/plant-segments";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/config";
import { ApprovalsDateFilter } from "@/components/dashboard/ApprovalsDateFilter";
import {
  EntryApprovalsPanel,
  type PendingEntryRow,
} from "@/components/dashboard/EntryApprovalsPanel";
import { pendingEntryWhere } from "@/lib/entry-approval";
import type { EntryApprovalKind } from "@/lib/entry-approval";

const VALID_TABS = new Set<EntryApprovalKind>([
  "purchase",
  "sale",
  "stock",
  "expense",
]);

const TAB_ORDER: EntryApprovalKind[] = ["purchase", "sale", "stock", "expense"];

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canApproveEntries(session.user.globalRole)) {
    redirect("/");
  }

  const { from: fromStr, to: toStr, tab: tabParam } = await searchParams;
  const plantIds = await getAccessiblePlantIds(session.user.id);
  const selectedPlantId = await resolveSelectedPlantId(session.user.id, {
    hasGlobalPlantAccess: hasGlobalPlantAccess(session.user.globalRole),
  });
  const locale = (await getLocale()) as AppLocale;

  if (plantIds.length === 0) {
    return (
      <div style={{ padding: "2rem" }} className="approvals-page">
        <h1 className="page-title">Entry Approvals</h1>
        <p className="page-sub">No plants are available to review.</p>
      </div>
    );
  }

  const scopedPlantIds =
    selectedPlantId && plantIds.includes(selectedPlantId)
      ? [selectedPlantId]
      : plantIds;

  let fromDate: Date | undefined;
  let toDate: Date | undefined;
  if (fromStr && dateOnlyRegex.test(fromStr)) fromDate = parseDateOnly(fromStr);
  if (toStr && dateOnlyRegex.test(toStr)) toDate = parseDateOnly(toStr);

  const pendingWhere = {
    plantId: { in: scopedPlantIds },
    ...pendingEntryWhere(fromDate, toDate),
  };

  const [purchases, sales, stocks, expenses] = await Promise.all([
    prisma.purchase.findMany({
      where: pendingWhere,
      include: {
        plant: { select: { name: true, code: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.sale.findMany({
      where: pendingWhere,
      include: {
        plant: { select: { name: true, code: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.stockEntry.findMany({
      where: pendingWhere,
      include: {
        plant: { select: { name: true, code: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.pettyCashEntry.findMany({
      where: {
        ...pendingWhere,
        entryType: { in: ["EXPENSE", "PETTY_CASH"] },
      },
      include: {
        plant: { select: { name: true, code: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  const tabCounts: Record<EntryApprovalKind, number> = {
    purchase: purchases.length,
    sale: sales.length,
    stock: stocks.length,
    expense: expenses.length,
  };
  const initialTab = VALID_TABS.has(tabParam as EntryApprovalKind)
    ? (tabParam as EntryApprovalKind)
    : (TAB_ORDER.find((tab) => tabCounts[tab] > 0) ?? "purchase");

  const entries: PendingEntryRow[] = [
    ...purchases.map((p) => ({
      id: p.id,
      kind: "purchase" as const,
      plantId: p.plantId,
      date: p.date.toISOString(),
      shift: p.shift,
      plantName: getPlantDisplayName(p.plant.code, p.plant.name),
      enteredByName: p.enteredBy.name,
      label: p.itemDescription,
      detail: p.vendorName,
      amount: Number(p.invoiceValue),
    })),
    ...sales.map((s) => ({
      id: s.id,
      kind: "sale" as const,
      plantId: s.plantId,
      date: s.date.toISOString(),
      shift: s.shift,
      plantName: getPlantDisplayName(s.plant.code, s.plant.name),
      enteredByName: s.enteredBy.name,
      label: s.itemDescription,
      detail: s.customerName,
      amount: Number(s.salesValue),
    })),
    ...stocks.map((s) => ({
      id: s.id,
      kind: "stock" as const,
      plantId: s.plantId,
      date: s.date.toISOString(),
      shift: s.shift,
      plantName: getPlantDisplayName(s.plant.code, s.plant.name),
      enteredByName: s.enteredBy.name,
      label: s.itemName,
      detail: s.notes ?? "",
      amount: Number(s.closingValue),
    })),
    ...expenses.map((e) => ({
      id: e.id,
      kind: "expense" as const,
      plantId: e.plantId,
      date: e.date.toISOString(),
      shift: e.shift,
      plantName: getPlantDisplayName(e.plant.code, e.plant.name),
      enteredByName: e.enteredBy.name,
      label: e.expenseHead,
      detail: e.description ?? e.nature ?? "",
      amount:
        Number(e.amount) +
        Number(e.contractorSalary) +
        Number(e.supervisorSalary),
    })),
  ];

  return (
    <div style={{ padding: "2rem" }} className="approvals-page">
      <h1 className="page-title">Entry Approvals</h1>

      <ApprovalsDateFilter from={fromStr ?? ""} to={toStr ?? ""} />

      <EntryApprovalsPanel
        entries={entries}
        initialTab={initialTab}
        locale={locale}
      />
    </div>
  );
}
