import { isBackdated, parseDateOnly } from "@/lib/dates";
import { round2, round4 } from "@/lib/pnl/excel-import/cells";
import { stockSourceKey } from "@/lib/pnl/excel-import/dedupe";
import type { ParsedPnlWorkbook } from "@/lib/pnl/excel-import/parse";
import {
  encodeQuadSignalStockNotes,
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import {
  calculateQuadSignalWip,
  drumLabelToLengthFactor,
  parseDrumLengthOptions,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip";
import { approvalFor, type PersistCtx } from "@/lib/pnl/excel-import/persist-types";

export async function persistStock(
  ctx: PersistCtx,
  stock: ParsedPnlWorkbook["stock"],
) {
  const {
    prisma,
    writePlantId,
    enteredById,
    role,
    familyKey,
    pScope,
    uploadedAt,
    summary,
    seenKeys,
    daysToRefresh,
    markDuplicate,
  } = ctx;

  for (const row of stock) {
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
        ["Conductor"],
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
          ...(row.qsCallPutup?.trim()
            ? { callPutup: row.qsCallPutup.trim() }
            : {}),
          ...(row.qsPutupDate?.trim()
            ? { putupDate: row.qsPutupDate.trim() }
            : {}),
          ...(row.qsPartyName?.trim()
            ? { partyName: row.qsPartyName.trim() }
            : {}),
          ...(row.qsDispatchPending != null
            ? { dispatchPending: row.qsDispatchPending }
            : {}),
          ...(row.qsDispatchParty?.trim()
            ? { dispatchParty: row.qsDispatchParty.trim() }
            : {}),
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
}
