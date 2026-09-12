/**
 * Persist parsed P&L Excel rows into Prisma tables.
 * Skips rows that already exist (same content) — re-uploading the same file
 * or overlapping rows across files will not create duplicates.
 */
import {
  GlobalRole,
  ManpowerShift,
  PettyCashKind,
  type PrismaClient,
} from "@prisma/client";
import { isBackdated, parseDateOnly } from "@/lib/dates";
import { entryApprovalCreateData } from "@/lib/entry-approval";
import { safeRefreshDailyStatus } from "@/lib/daily-status";
import { syncDailyExpenseMarker } from "@/lib/daily-expense-marker";
import {
  monthStart,
  round2,
  round4,
} from "@/lib/pnl/excel-import/cells";
import {
  expenseSourceKey,
  farSourceKey,
  purchaseSourceKey,
  saleSourceKey,
  stockSourceKey,
} from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import {
  encodeQuadSignalStockNotes,
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  PVC_FAR_DEP_PERCENT,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import {
  importFamilyKey,
  plantIdFilter,
  resolveCanonicalWritePlantId,
  resolveReportPlantIds,
} from "@/lib/plant-merge";
import {
  calculateQuadSignalWip,
  drumLabelToLengthFactor,
  parseDrumLengthOptions,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip";

export type ImportSummary = {
  batchId: string;
  uploadedAt: string;
  sales: number;
  purchases: number;
  stock: number;
  expenses: number;
  electricity: number;
  rent: number;
  far: number;
  /** Rows skipped because the same data already exists (nothing to fill). */
  duplicates: number;
  /** Existing rows that received previously empty fields from this file. */
  updated: number;
  /** True when every row in the file was already present and nothing was filled. */
  alreadyUploaded: boolean;
  skipped: { sheet: string; row: number; reason: string }[];
  sheetsFound: string[];
};

function isBlankText(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === "";
}

function approvalFor(role: GlobalRole, dateYmd: string) {
  return entryApprovalCreateData(role, dateYmd);
}

export async function persistPnlImport(opts: {
  prisma: PrismaClient;
  plantId: string;
  enteredById: string;
  role: GlobalRole;
  parsed: ParsedPnlWorkbook;
  batchId: string;
  uploadedAt: Date;
}): Promise<ImportSummary> {
  const { prisma, plantId, enteredById, role, parsed, batchId, uploadedAt } =
    opts;

  const writePlantId = await resolveCanonicalWritePlantId(plantId);
  const scopeIds = await resolveReportPlantIds(plantId);
  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { code: true },
  });
  const familyKey = importFamilyKey(plant?.code);
  const pScope = plantIdFilter(scopeIds);

  const summary: ImportSummary = {
    batchId,
    uploadedAt: uploadedAt.toISOString(),
    sales: 0,
    purchases: 0,
    stock: 0,
    expenses: 0,
    electricity: 0,
    rent: 0,
    far: 0,
    duplicates: 0,
    updated: 0,
    alreadyUploaded: false,
    skipped: [...parsed.skipped],
    sheetsFound: parsed.sheetsFound,
  };

  const seenKeys = new Set<string>();
  const daysToRefresh = new Map<string, ManpowerShift>();

  function markDuplicate(sheet: string, row: number, reason: string) {
    summary.duplicates += 1;
    summary.skipped.push({ sheet, row, reason });
  }

  // ── Sales ──────────────────────────────────────────────────────────
  for (const row of parsed.sales) {
    const sourceKey = saleSourceKey(familyKey, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Sales", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const existing = await prisma.sale.findFirst({
      where: {
        ...pScope,
        OR: [
          { sourceKey },
          { id: sourceKey },
          {
            date: day,
            customerName: row.customerName,
            itemDescription: row.itemDescription,
            quantity: row.quantity,
            rate: row.rate,
            ...(row.billNumber ? { billNumber: row.billNumber } : {}),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Sales", row.row, "Already uploaded");
      continue;
    }

    const salesValue = round2(row.quantity * row.rate);
    const approval = approvalFor(role, row.date);
    await prisma.sale.create({
      data: {
        id: sourceKey,
        sourceKey,
        plantId: writePlantId,
        date: day,
        shift: row.shift,
        type: row.type,
        typeOther: row.typeOther,
        customerName: row.customerName,
        billNumber: row.billNumber,
        billDate: row.billDate ? parseDateOnly(row.billDate) : null,
        itemDescription: row.itemDescription,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        salesValue,
        inMeter: row.inMeter ?? null,
        qtyMtr: row.qtyMtr ?? null,
        meterUnit: row.meterUnit ?? null,
        notes: row.notes,
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
    });
    summary.sales += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Purchases ──────────────────────────────────────────────────────
  for (const row of parsed.purchases) {
    const sourceKey = purchaseSourceKey(familyKey, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Purchase", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const day = parseDateOnly(row.date);
    const existing = await prisma.purchase.findFirst({
      where: {
        ...pScope,
        OR: [
          { sourceKey },
          { id: sourceKey },
          {
            date: day,
            vendorName: row.vendorName,
            itemDescription: row.itemDescription,
            quantity: row.quantity,
            rate: row.rate,
            ...(row.billNumber ? { billNumber: row.billNumber } : {}),
          },
        ],
      },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        notes: true,
        gstin: true,
        unit: true,
        typeOther: true,
        debitQuantity: true,
        sourceKey: true,
      },
    });
    if (existing) {
      const patch: {
        billNumber?: string | null;
        billDate?: Date | null;
        notes?: string | null;
        gstin?: string | null;
        unit?: string;
        typeOther?: string | null;
        debitQuantity?: number;
        sourceKey?: string;
        excelUploadedAt?: Date;
      } = {};

      if (isBlankText(existing.billNumber) && !isBlankText(row.billNumber)) {
        patch.billNumber = row.billNumber;
      }
      if (existing.billDate == null && row.billDate) {
        patch.billDate = parseDateOnly(row.billDate);
      }
      if (isBlankText(existing.notes) && !isBlankText(row.notes)) {
        patch.notes = row.notes;
      }
      if (isBlankText(existing.gstin) && !isBlankText(row.gstin)) {
        patch.gstin = row.gstin;
      }
      if (isBlankText(existing.typeOther) && !isBlankText(row.typeOther)) {
        patch.typeOther = row.typeOther;
      }
      const existingUnit = (existing.unit ?? "").trim();
      const incomingUnit = (row.unit ?? "").trim();
      if (
        incomingUnit &&
        (isBlankText(existingUnit) ||
          (existingUnit.toLowerCase() === "kg" &&
            incomingUnit.toLowerCase() !== "kg"))
      ) {
        patch.unit = incomingUnit;
      }
      const existingDebit = Number(existing.debitQuantity ?? 0);
      if (
        (!(existingDebit > 0) || !Number.isFinite(existingDebit)) &&
        row.debitQuantity > 0
      ) {
        patch.debitQuantity = row.debitQuantity;
      }
      if (isBlankText(existing.sourceKey) && sourceKey) {
        patch.sourceKey = sourceKey;
      }

      if (Object.keys(patch).length > 0) {
        patch.excelUploadedAt = uploadedAt;
        await prisma.purchase.update({
          where: { id: existing.id },
          data: patch,
        });
        summary.updated += 1;
        summary.skipped.push({
          sheet: "Purchase",
          row: row.row,
          reason: "Duplicate — filled missing fields",
        });
        daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
      } else {
        markDuplicate("Purchase", row.row, "Already uploaded");
      }
      continue;
    }

    const basicValue = round2(
      (row.quantity - (row.debitQuantity || 0)) * row.rate,
    );
    const gstAmount = round2(basicValue * (row.gstPercent / 100));
    const invoiceValue = round2(basicValue + gstAmount);
    const approval = approvalFor(role, row.date);
    await prisma.purchase.create({
      data: {
        id: sourceKey,
        sourceKey,
        plantId: writePlantId,
        date: day,
        shift: row.shift,
        type: row.type,
        typeOther: row.typeOther,
        vendorName: row.vendorName,
        billNumber: row.billNumber,
        billDate: row.billDate ? parseDateOnly(row.billDate) : null,
        itemDescription: row.itemDescription,
        unit: row.unit,
        quantity: row.quantity,
        debitQuantity: row.debitQuantity || 0,
        rate: row.rate,
        basicValue,
        gstPercent: row.gstPercent,
        gstAmount,
        invoiceValue,
        gstin: row.gstin,
        notes: row.notes,
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
    });
    summary.purchases += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Stock ──────────────────────────────────────────────────────────
  for (const row of parsed.stock) {
    const day = parseDateOnly(row.date);

    let quantity = round4(row.quantity);
    let notes = row.notes;
    let category = row.category;

    if (row.qsKind === "raw") {
      notes = encodeQuadSignalStockNotes(
        { v: 1, kind: "raw" },
        row.notes?.trim() || `Closing stock as on ${row.date}`,
      );
      category = "RM";
    } else if (row.qsKind === "cable") {
      if (!row.qsCable || !row.qsSize) {
        summary.skipped.push({
          sheet: "Stock",
          row: row.row,
          reason: "Cable stock requires Item (cable) and Size",
        });
        continue;
      }
      const processes = [...getQuadSignalCableProcesses(row.qsCable)];
      const production: Record<string, number> = {};
      const src = row.qsProduction ?? {};
      const aliasGroups: string[][] = [
        ["Insulation"],
        ["Single Quad"],
        ["Laying"],
        ["Inner Sheath", "Inner"],
        ["Screening"],
        ["Intermediate"],
        ["DST"],
        ["Outer Sheath", "Outer"],
        ["Armouring", "Armoring"],
      ];
      for (const p of processes) {
        const group =
          aliasGroups.find((g) => g.includes(p)) ??
          aliasGroups.find((g) =>
            g.some((x) => x.toLowerCase() === p.toLowerCase()),
          );
        let v = src[p];
        if (v == null && group) {
          for (const alt of group) {
            if (src[alt] != null) {
              v = src[alt];
              break;
            }
          }
        }
        production[p] = v ?? 0;
      }

      const prior = await prisma.stockEntry.findMany({
        where: {
          ...pScope,
          date: { lt: day },
          category: "FG",
          OR: [
            { itemName: row.itemName },
            { notes: { startsWith: "QSSTOCK:" } },
          ],
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 30,
        select: { itemName: true, notes: true },
      });
      let opening: Record<string, number> = {};
      for (const p of prior) {
        const { meta } = parseQuadSignalStockNotes(p.notes);
        const same =
          p.itemName === row.itemName ||
          (meta?.kind === "cable" &&
            meta.cable === row.qsCable &&
            meta.size === row.qsSize);
        if (!same) continue;
        opening = quadSignalClosingFromMeta(meta);
        break;
      }

      const variant = resolveQuadSignalVariant(row.qsSize);
      let lengthFactor = variant?.lengthFactor ?? 1;
      let drumLabel = row.qsDrumLabel?.trim() || variant?.drumLabel || "";
      if (row.qsDrumLabel?.trim()) {
        const opts = parseDrumLengthOptions(row.qsDrumLabel);
        const hit = opts.find(
          (o) =>
            o.label.toLowerCase() === row.qsDrumLabel!.trim().toLowerCase() ||
            String(o.lengthFactor) === row.qsDrumLabel!.trim(),
        );
        if (hit) {
          lengthFactor = hit.lengthFactor;
          drumLabel = hit.label;
        } else {
          lengthFactor = drumLabelToLengthFactor(row.qsDrumLabel).lengthFactor;
          drumLabel = row.qsDrumLabel.trim();
        }
      }

      const salesKm = row.qsSalesKm ?? 0;
      const wip = calculateQuadSignalWip({
        processes,
        opening,
        production,
        salesKm,
        coreCount: variant?.coreCount ?? 1,
        lengthFactor,
      });
      if (wip.finishedProcess != null) {
        quantity = round4(wip.byProcess[wip.finishedProcess] ?? quantity);
      }
      notes = encodeQuadSignalStockNotes(
        {
          v: 2,
          kind: "cable",
          cable: row.qsCable,
          size: row.qsSize,
          production,
          opening,
          closing: wip.byProcess,
          processes: wip.byProcess,
          salesKm,
          calcSnapshot: {
            ...wip.calcSnapshot,
            drumLabel: drumLabel || undefined,
          },
        },
        row.notes?.trim() || `Closing stock as on ${row.date}`,
      );
      category = "FG";
    }

    const keyed = { ...row, quantity };
    const sourceKey = stockSourceKey(familyKey, keyed);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Stock", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const existing = await prisma.stockEntry.findFirst({
      where: {
        ...pScope,
        OR: [
          { sourceKey },
          {
            date: day,
            itemName: row.itemName,
            quantity,
            rate: round4(row.rate),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Stock", row.row, "Already uploaded");
      continue;
    }

    const closingValue = round2(quantity * row.rate);
    const approval = approvalFor(role, row.date);
    await prisma.stockEntry.create({
      data: {
        sourceKey,
        plantId: writePlantId,
        date: day,
        shift: row.shift,
        itemName: row.itemName,
        category,
        unit: row.unit,
        quantity,
        rate: round4(row.rate),
        closingValue,
        notes,
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
    });
    summary.stock += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  // ── Expenses (routed by head) ──────────────────────────────────────
  for (const row of parsed.expenses) {
    const day = parseDateOnly(row.date);
    const month = monthStart(day);

    if (row.target === "electricity") {
      const opening = row.openingReading;
      const closing = row.closingReading;
      const consumed =
        opening != null && closing != null
          ? Math.max(0, closing - opening)
          : null;
      const billAmount = round2(row.amount);

      const existing = await prisma.electricityRent.findUnique({
        where: { plantId_month: { plantId: writePlantId, month } },
        select: { billAmount: true },
      });
      if (
        existing &&
        Number(existing.billAmount) === billAmount &&
        billAmount > 0
      ) {
        markDuplicate("Electricity", row.row, "Already uploaded");
        continue;
      }

      await prisma.electricityRent.upsert({
        where: { plantId_month: { plantId: writePlantId, month } },
        create: {
          plantId: writePlantId,
          month,
          openingReading: opening,
          closingReading: closing,
          consumedUnits: consumed,
          billAmount,
          rentAmount: 0,
          notes: row.description,
          excelUploadedAt: uploadedAt,
        },
        update: {
          openingReading: opening ?? undefined,
          closingReading: closing ?? undefined,
          consumedUnits: consumed ?? undefined,
          billAmount,
          notes: row.description ?? undefined,
          excelUploadedAt: uploadedAt,
        },
      });
      summary.electricity += 1;
      try {
        await syncDailyExpenseMarker({
          plantId: writePlantId,
          date: day,
          shift: row.shift,
          expenseHead: row.expenseHead,
          amount: billAmount,
          enteredById,
          description: row.description,
          payMode: row.payMode,
        });
      } catch {
        /* best-effort */
      }
      continue;
    }

    if (row.target === "rent") {
      const area = row.coveredAreaSqft;
      const rate = row.rentRatePerSqft;
      const rentAmount =
        row.amount > 0
          ? round2(row.amount)
          : area != null && rate != null
            ? round2(area * rate)
            : round2(row.amount);

      const existing = await prisma.electricityRent.findUnique({
        where: { plantId_month: { plantId: writePlantId, month } },
        select: { rentAmount: true },
      });
      if (
        existing &&
        Number(existing.rentAmount) === rentAmount &&
        rentAmount > 0
      ) {
        markDuplicate("Rent", row.row, "Already uploaded");
        continue;
      }

      await prisma.electricityRent.upsert({
        where: { plantId_month: { plantId: writePlantId, month } },
        create: {
          plantId: writePlantId,
          month,
          billAmount: 0,
          rentAmount,
          coveredAreaSqft: area,
          rentRatePerSqft: rate,
          notes: row.description,
          excelUploadedAt: uploadedAt,
        },
        update: {
          rentAmount,
          coveredAreaSqft: area ?? undefined,
          rentRatePerSqft: rate ?? undefined,
          notes: row.description ?? undefined,
          excelUploadedAt: uploadedAt,
        },
      });
      summary.rent += 1;
      try {
        await syncDailyExpenseMarker({
          plantId: writePlantId,
          date: day,
          shift: row.shift,
          expenseHead: row.expenseHead,
          amount: rentAmount,
          enteredById,
          description: row.description,
          payMode: row.payMode,
        });
      } catch {
        /* best-effort */
      }
      continue;
    }

    if (row.target === "far") {
      const cost = round2(row.cost ?? row.amount);
      const gst =
        row.gst != null ? round2(row.gst) : round2(cost * 0.18);
      const invoiceValue = round2(cost + gst);
      const dep = row.depreciationPercent ?? PVC_FAR_DEP_PERCENT;
      const sourceKey = farSourceKey(familyKey, {
        date: row.date,
        description: row.description || row.expenseHead,
        vendor: row.vendor,
        billNumber: row.billNumber,
        cost,
      });
      if (seenKeys.has(sourceKey)) {
        markDuplicate("FAR", row.row, "Duplicate row in this file");
        continue;
      }
      seenKeys.add(sourceKey);

      const existing = await prisma.fixedAsset.findFirst({
        where: {
          ...pScope,
          OR: [
            {
              billNumber: row.billNumber ?? undefined,
              assetDescription: row.description || row.expenseHead,
            },
            {
              assetDescription: row.description || row.expenseHead,
              vendor: row.vendor ?? undefined,
              cost,
            },
          ],
        },
        select: { id: true },
      });
      if (existing) {
        markDuplicate("FAR", row.row, "Already uploaded");
        continue;
      }

      await prisma.fixedAsset.create({
        data: {
          plantId: writePlantId,
          assetDescription: row.description || row.expenseHead,
          vendor: row.vendor,
          billNumber: row.billNumber,
          billDate: day,
          cost,
          gst,
          invoiceValue,
          depreciationPercent: dep,
          excelUploadedAt: uploadedAt,
        },
      });
      summary.far += 1;
      continue;
    }

    // Petty / generic expense
    const sourceKey = expenseSourceKey(familyKey, row);
    if (seenKeys.has(sourceKey)) {
      markDuplicate("Expense", row.row, "Duplicate row in this file");
      continue;
    }
    seenKeys.add(sourceKey);

    const approval = approvalFor(role, row.date);
    const total =
      row.amount + row.contractorSalary + row.supervisorSalary;
    if (!(total > 0)) {
      summary.skipped.push({
        sheet: "Expense",
        row: row.row,
        reason: "Expense amount is zero",
      });
      continue;
    }

    const existing = await prisma.pettyCashEntry.findFirst({
      where: {
        ...pScope,
        OR: [
          { sourceKey },
          { id: sourceKey },
          {
            date: day,
            expenseHead: row.nature || row.expenseHead,
            amount: round2(row.amount),
            ...(row.description
              ? { description: row.description }
              : {}),
          },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      markDuplicate("Expense", row.row, "Already uploaded");
      continue;
    }

    const isPetty =
      /petty/i.test(row.expenseHead) ||
      row.contractorSalary > 0 ||
      row.supervisorSalary > 0;
    await prisma.pettyCashEntry.create({
      data: {
        id: sourceKey,
        sourceKey,
        plantId: writePlantId,
        date: day,
        shift: row.shift,
        entryType: isPetty ? PettyCashKind.PETTY_CASH : PettyCashKind.EXPENSE,
        payMode: row.payMode || "Cash",
        expenseHead: row.nature || row.expenseHead,
        nature: row.nature,
        description: row.description,
        billNumber: row.billNumber,
        openingReading: row.openingReading,
        closingReading: row.closingReading,
        amount: round2(row.amount),
        contractorSalary: round2(row.contractorSalary),
        supervisorSalary: round2(row.supervisorSalary),
        enteredById,
        isBackdated: isBackdated(row.date),
        excelUploadedAt: uploadedAt,
        ...approval,
      },
    });
    summary.expenses += 1;
    daysToRefresh.set(`${row.date}|${row.shift}`, row.shift);
  }

  for (const [key, shift] of daysToRefresh) {
    const dateYmd = key.split("|")[0]!;
    await safeRefreshDailyStatus(
      writePlantId,
      parseDateOnly(dateYmd),
      shift,
      enteredById,
    );
  }

  const imported =
    summary.sales +
    summary.purchases +
    summary.stock +
    summary.expenses +
    summary.electricity +
    summary.rent +
    summary.far;
  summary.alreadyUploaded =
    imported === 0 && summary.duplicates > 0 && summary.updated === 0;

  return summary;
}
