import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { dateOnlyRegex, parseDateOnly } from "@/lib/dates";
import { getAccessiblePlantIds } from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { GlobalRole } from "@prisma/client";
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

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.globalRole !== GlobalRole.BUSINESS_HEAD) {
    redirect("/");
  }

  const { from: fromStr, to: toStr, tab: tabParam } = await searchParams;
  const plantIds = await getAccessiblePlantIds(session.user.id);
  const selectedPlantId = await resolveSelectedPlantId(session.user.id);
  const locale = (await getLocale()) as AppLocale;
  const initialTab = VALID_TABS.has(tabParam as EntryApprovalKind)
    ? (tabParam as EntryApprovalKind)
    : "purchase";

  if (!selectedPlantId || !plantIds.includes(selectedPlantId)) {
    return (
      <div style={{ padding: "2rem" }} className="approvals-page">
        <h1 className="page-title">Entry Approvals</h1>
        <p className="page-sub">
          Select a plant from the sidebar to review and approve entries for that
          plant.
        </p>
      </div>
    );
  }

  const selectedPlant = await prisma.plant.findUnique({
    where: { id: selectedPlantId },
    select: { name: true },
  });

  let fromDate: Date | undefined;
  let toDate: Date | undefined;
  if (fromStr && dateOnlyRegex.test(fromStr)) fromDate = parseDateOnly(fromStr);
  if (toStr && dateOnlyRegex.test(toStr)) toDate = parseDateOnly(toStr);

  const pendingWhere = {
    plantId: selectedPlantId,
    ...pendingEntryWhere(fromDate, toDate),
  };

  const [purchases, sales, stocks, expenses] = await Promise.all([
    prisma.purchase.findMany({
      where: pendingWhere,
      include: {
        plant: { select: { name: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.sale.findMany({
      where: pendingWhere,
      include: {
        plant: { select: { name: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.stockEntry.findMany({
      where: pendingWhere,
      include: {
        plant: { select: { name: true } },
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
        plant: { select: { name: true } },
        enteredBy: { select: { name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
  ]);

  const entries: PendingEntryRow[] = [
    ...purchases.map((p) => ({
      id: p.id,
      kind: "purchase" as const,
      plantId: p.plantId,
      date: p.date.toISOString(),
      shift: p.shift,
      plantName: p.plant.name,
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
      plantName: s.plant.name,
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
      plantName: s.plant.name,
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
      plantName: e.plant.name,
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
      <p className="page-sub">
        Pending entries for{" "}
        <strong>{selectedPlant?.name ?? "selected plant"}</strong>. Switch plant
        in the sidebar to approve entries for another plant. Your own entries
        are approved automatically and never appear here.
      </p>

      <ApprovalsDateFilter from={fromStr ?? ""} to={toStr ?? ""} />

      <EntryApprovalsPanel
        entries={entries}
        initialTab={initialTab}
        locale={locale}
      />
    </div>
  );
}
