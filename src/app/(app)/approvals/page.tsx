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
import { parseQuadSignalStockNotes } from "@/lib/plant-catalogs";
import {
  formatElectricityApprovalDetail,
  isElectricityExpenseHead,
} from "@/lib/electricity-readings";
import { enrichExpenseElectricityReadings } from "@/lib/electricity-readings-enrich";
import { resolveCanonicalWritePlantId } from "@/lib/plant-merge";

function fmtQty(n: number): string {
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: 4,
  });
}

function fmtRate(n: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function joinDetail(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(" · ");
}

const VALID_TABS = new Set<EntryApprovalKind>([
  "purchase",
  "sale",
  "stock",
  "expense",
]);

const TAB_ORDER: EntryApprovalKind[] = ["purchase", "sale", "stock", "expense"];

function stockUserRemark(notes: string | null | undefined): string {
  const raw = notes?.trim() ?? "";
  if (!raw) return "";
  const { meta, userNotes } = parseQuadSignalStockNotes(raw);
  if (meta) return userNotes.trim();
  return raw;
}

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
      <div style={{ padding: "1rem 1.5rem 2rem" }} className="approvals-page">
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

  const expensesByPlant = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const list = expensesByPlant.get(e.plantId) ?? [];
    list.push(e);
    expensesByPlant.set(e.plantId, list);
  }
  const enrichedExpenses: typeof expenses = [];
  for (const [plantId, rows] of expensesByPlant) {
    const writePlantId = await resolveCanonicalWritePlantId(plantId);
    enrichedExpenses.push(
      ...(await enrichExpenseElectricityReadings(writePlantId, rows)),
    );
  }

  const entries: PendingEntryRow[] = [
    ...purchases.map((p) => {
      const qty = Number(p.quantity);
      const rate = Number(p.rate);
      return {
        id: p.id,
        kind: "purchase" as const,
        plantId: p.plantId,
        date: p.date.toISOString(),
        shift: p.shift,
        plantName: getPlantDisplayName(p.plant.code, p.plant.name),
        enteredByName: p.enteredBy.name,
        label: p.itemDescription,
        detail: joinDetail([
          p.vendorName,
          Number.isFinite(qty)
            ? `${fmtQty(qty)} ${p.unit || ""}`.trim()
            : null,
          Number.isFinite(rate) && rate > 0 ? `@ ₹${fmtRate(rate)}` : null,
          p.billNumber?.trim() ? `Bill ${p.billNumber.trim()}` : null,
          Number(p.gstPercent) > 0 ? `GST ${Number(p.gstPercent)}%` : null,
        ]),
        remark: p.notes?.trim() || null,
        amount: Number(p.invoiceValue),
      };
    }),
    ...sales.map((s) => {
      const qty = Number(s.quantity);
      const rate = Number(s.rate);
      return {
        id: s.id,
        kind: "sale" as const,
        plantId: s.plantId,
        date: s.date.toISOString(),
        shift: s.shift,
        plantName: getPlantDisplayName(s.plant.code, s.plant.name),
        enteredByName: s.enteredBy.name,
        label: s.itemDescription,
        detail: joinDetail([
          s.customerName,
          Number.isFinite(qty)
            ? `${fmtQty(qty)} ${s.unit || ""}`.trim()
            : null,
          Number.isFinite(rate) && rate > 0 ? `@ ₹${fmtRate(rate)}` : null,
          s.billNumber?.trim() ? `Bill ${s.billNumber.trim()}` : null,
        ]),
        remark: s.notes?.trim() || null,
        amount: Number(s.salesValue),
      };
    }),
    ...stocks.map((s) => {
      const qty = Number(s.quantity);
      const rate = Number(s.rate);
      const unit = String(s.unit ?? "").trim() || "kg";
      const note = String(s.notes ?? "");
      const entryKind = note.startsWith("Closing stock")
        ? "Closing stock"
        : note.startsWith("Issued quantity")
          ? "Issued quantity"
          : null;
      return {
        id: s.id,
        kind: "stock" as const,
        plantId: s.plantId,
        date: s.date.toISOString(),
        shift: s.shift,
        plantName: getPlantDisplayName(s.plant.code, s.plant.name),
        enteredByName: s.enteredBy.name,
        label: s.itemName,
        detail: joinDetail([
          s.category ? String(s.category) : null,
          entryKind,
          Number.isFinite(qty) ? `${fmtQty(qty)} ${unit}` : unit,
          Number.isFinite(rate) && rate > 0 ? `@ ₹${fmtRate(rate)}` : null,
        ]),
        remark: stockUserRemark(s.notes) || null,
        amount: Number(s.closingValue),
      };
    }),
    ...enrichedExpenses.map((e) => ({
      id: e.id,
      kind: "expense" as const,
      plantId: e.plantId,
      date: e.date.toISOString(),
      shift: e.shift,
      plantName: getPlantDisplayName(e.plant.code, e.plant.name),
      enteredByName: e.enteredBy.name,
      label: e.expenseHead,
      detail: joinDetail([
        isElectricityExpenseHead(e.expenseHead)
          ? formatElectricityApprovalDetail({
              nature: e.nature,
              openingReading: e.openingReading,
              closingReading: e.closingReading,
            })
          : e.nature,
        e.payMode?.trim() ? `Pay ${e.payMode.trim()}` : null,
        e.location?.trim() || null,
        e.billNumber?.trim() ? `Bill ${e.billNumber.trim()}` : null,
      ]),
      remark: e.description?.trim() || null,
      amount:
        Number(e.amount) +
        Number(e.contractorSalary) +
        Number(e.supervisorSalary),
    })),
  ];

  return (
    <div style={{ padding: "1rem 1.5rem 2rem" }} className="approvals-page">
      <ApprovalsDateFilter from={fromStr ?? ""} to={toStr ?? ""} />

      <EntryApprovalsPanel
        entries={entries}
        initialTab={initialTab}
        locale={locale}
      />
    </div>
  );
}
