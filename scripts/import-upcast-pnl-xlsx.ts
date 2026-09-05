/**
 * Import ATCL Upcast Plant P&L-V1.xlsx into plant UPCAST.
 *
 * Sections → tables:
 *   Sales          → Sale (+ empty transfer section skipped)
 *   Purchase       → Purchase (vendor rows; empty transfer skipped)
 *   Misc Exp.      → PettyCashEntry (natures → Upcast direct/indirect heads)
 *   ERS stock      → StockEntry (Closing stock …)
 *   ERS electricity/rent → ElectricityRent (only months with amounts)
 *   FAR            → FixedAsset
 *
 * Idempotent via sourceKey / deterministic notes. Re-run safe.
 *
 * Usage:
 *   CONFIRM_UPCAST_IMPORT=1 npx tsx --env-file=.env scripts/import-upcast-pnl-xlsx.ts
 */
import ExcelJS from "exceljs";
import {
  PettyCashKind,
  PurchaseType,
  SaleType,
  StockCategory,
} from "@prisma/client";
import { getPrisma } from "../src/lib/db";
import {
  normalizeUpcastExpenseHead,
  UPCAST_MISC_NATURES,
} from "../src/lib/plant-catalogs";

const XLSX_PATH =
  process.env.UPCAST_XLSX_PATH ??
  "c:/Users/Admin/Downloads/ATCL_Upcast Plant P&L-V1.xlsx";
const SOURCE = "upcast-v1";
const GST_PERCENT = 18;

function cellVal(cell: ExcelJS.Cell | undefined): unknown {
  if (!cell) return null;
  const v = cell.value as unknown;
  if (v == null) return null;
  if (typeof v === "object" && v !== null && "result" in (v as object)) {
    const r = (v as { result?: unknown }).result;
    // Shared formula with no cached result
    if (r === undefined) return null;
    return r;
  }
  if (typeof v === "object" && v !== null && "richText" in (v as object)) {
    return (v as { richText: { text: string }[] }).richText
      .map((t) => t.text)
      .join("");
  }
  if (typeof v === "object" && v !== null && "text" in (v as object)) {
    return (v as { text: string }).text;
  }
  if (typeof v === "object" && v !== null && "formula" in (v as object)) {
    return (v as { result?: unknown }).result ?? null;
  }
  return v;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v)
    .replace(/,/g, "")
    .replace(/[^\d.\-]/g, "")
    .trim();
  if (!s || s === "-" || s === "." || s === "-.") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}

function asUtcDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  const s = str(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return null;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

function saleTypeFromDesc(desc: string): SaleType {
  if (/copper/i.test(desc)) return SaleType.COPPER_SCRAP;
  if (/aluminium|aluminum/i.test(desc)) return SaleType.ALUMINIUM_SCRAP;
  return SaleType.OTHERS;
}

function purchaseTypeFromDesc(desc: string): PurchaseType {
  if (/manpower|salary|sorting/i.test(desc)) return PurchaseType.OTHERS;
  if (/scrap|dori|strip|rassa|pipe|copper/i.test(desc)) {
    return PurchaseType.RAW_MATERIAL;
  }
  return PurchaseType.RAW_MATERIAL;
}

async function main() {
  if (process.env.CONFIRM_UPCAST_IMPORT !== "1") {
    console.error("Set CONFIRM_UPCAST_IMPORT=1 to run the import.");
    process.exit(1);
  }

  const prisma = getPrisma();
  const plant = await prisma.plant.findUnique({ where: { code: "UPCAST" } });
  if (!plant) throw new Error("UPCAST plant not found");

  const admin = await prisma.user.findFirst({
    where: { globalRole: "SUPER_ADMIN" },
    select: { id: true, email: true },
  });
  if (!admin) throw new Error("No SUPER_ADMIN user for enteredById");
  const enteredById = admin.id;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);

  const summary = {
    sales: 0,
    purchases: 0,
    misc: 0,
    stock: 0,
    electricity: 0,
    assets: 0,
    skipped: [] as string[],
  };

  // ─── Sales ───────────────────────────────────────────────────────────
  {
    const sheet = wb.getWorksheet("Sales");
    if (!sheet) throw new Error("Sales sheet missing");
    for (let r = 4; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const marker = str(cellVal(row.getCell(4))).toUpperCase();
      if (
        marker.includes("TOTAL AMOUNT") ||
        marker.includes("COPPER TRANSFER") ||
        marker.includes("ITEMS DETAILS") ||
        marker.includes("TOTAL VALUE")
      ) {
        break;
      }
      const customerName = str(cellVal(row.getCell(3)));
      const itemDescription = str(cellVal(row.getCell(4)));
      const billNumber = str(cellVal(row.getCell(5))) || null;
      const billDate = asUtcDate(cellVal(row.getCell(6)));
      const unit = str(cellVal(row.getCell(7))) || "KGS";
      const quantity = num(cellVal(row.getCell(8))) ?? 0;
      const rate = num(cellVal(row.getCell(9))) ?? 0;
      const basic = num(cellVal(row.getCell(10)));
      const remarks = str(cellVal(row.getCell(13))) || null;
      if (!customerName && !itemDescription && !billNumber) continue;
      if (!customerName) continue;

      const salesValue = round2(basic ?? quantity * rate);
      const date = billDate ?? new Date(Date.UTC(2026, 4, 31));
      const sourceKey = `${SOURCE}:sale:${r}`;

      await prisma.sale.upsert({
        where: { id: sourceKey },
        create: {
          id: sourceKey,
          sourceKey,
          plantId: plant.id,
          date,
          shift: "DAY",
          type: saleTypeFromDesc(itemDescription),
          customerName,
          billNumber,
          billDate,
          itemDescription,
          unit,
          quantity: round4(quantity),
          rate: round4(rate),
          salesValue,
          notes: remarks,
          enteredById,
          isBackdated: true,
        },
        update: {
          date,
          type: saleTypeFromDesc(itemDescription),
          customerName,
          billNumber,
          billDate,
          itemDescription,
          unit,
          quantity: round4(quantity),
          rate: round4(rate),
          salesValue,
          notes: remarks,
        },
      });
      summary.sales += 1;
    }
  }

  // ─── Purchases (vendor register + ATCL transfer section) ─────────────
  {
    const sheet = wb.getWorksheet("Purchase");
    if (!sheet) throw new Error("Purchase sheet missing");
    let mode: "vendor" | "atcl" = "vendor";
    for (let r = 4; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const marker = [3, 4, 5]
        .map((c) => str(cellVal(row.getCell(c))).toUpperCase())
        .join(" ");
      if (
        marker.includes("COPPER SCRAP TRANSFER") ||
        marker.includes("TRANSFER FROM CABLE")
      ) {
        mode = "atcl";
        continue;
      }
      if (
        marker.includes("ITEMS DETAILS") ||
        marker.includes("CHALLAN NO")
      ) {
        continue;
      }
      if (
        marker.includes("TOTAL AMOUNT") ||
        marker.includes("TOTAL VALUE") ||
        marker.includes("UNLOADING")
      ) {
        continue;
      }

      if (mode === "vendor") {
        const vendorName = str(cellVal(row.getCell(3)));
        const itemDescription = str(cellVal(row.getCell(4)));
        const billNumber = str(cellVal(row.getCell(5))) || null;
        const billDate = asUtcDate(cellVal(row.getCell(6)));
        const unit = str(cellVal(row.getCell(7))) || "KGS";
        const quantity = num(cellVal(row.getCell(8))) ?? 0;
        const rate = num(cellVal(row.getCell(9))) ?? 0;
        const basicValue = num(cellVal(row.getCell(10)));
        const gstAmount = num(cellVal(row.getCell(11)));
        const invoiceValue = num(cellVal(row.getCell(12)));
        const remarks = str(cellVal(row.getCell(13))) || null;

        if (!vendorName) continue;

        const basic = round2(basicValue ?? quantity * rate);
        const gst =
          gstAmount != null
            ? round2(gstAmount)
            : round2(basic * (GST_PERCENT / 100));
        const invoice =
          invoiceValue != null ? round2(invoiceValue) : round2(basic + gst);
        const date = billDate ?? new Date(Date.UTC(2026, 4, 31));
        const sourceKey = `${SOURCE}:purchase:${r}`;

        await prisma.purchase.upsert({
          where: { id: sourceKey },
          create: {
            id: sourceKey,
            sourceKey,
            plantId: plant.id,
            date,
            shift: "DAY",
            type: purchaseTypeFromDesc(itemDescription),
            vendorName,
            billNumber,
            billDate,
            itemDescription,
            unit,
            quantity: round4(quantity),
            rate: round4(rate),
            basicValue: basic,
            gstPercent: GST_PERCENT,
            gstAmount: gst,
            invoiceValue: invoice,
            notes: remarks,
            enteredById,
            isBackdated: true,
          },
          update: {
            date,
            type: purchaseTypeFromDesc(itemDescription),
            vendorName,
            billNumber,
            billDate,
            itemDescription,
            unit,
            quantity: round4(quantity),
            rate: round4(rate),
            basicValue: basic,
            gstPercent: GST_PERCENT,
            gstAmount: gst,
            invoiceValue: invoice,
            notes: remarks,
          },
        });
        summary.purchases += 1;
        continue;
      }

      // ATCL transfer block: cols 5=challan, 6=date, 7=unit, 8=qty, 9=rate, 10=value
      const itemDescription =
        str(cellVal(row.getCell(4))) || "Copper scrap transfer from ATCL";
      const billNumber = str(cellVal(row.getCell(5))) || null;
      const billDate = asUtcDate(cellVal(row.getCell(6)));
      const unit = str(cellVal(row.getCell(7))) || "KGS";
      const quantity = num(cellVal(row.getCell(8))) ?? 0;
      const rate = num(cellVal(row.getCell(9))) ?? 0;
      const basicValue = num(cellVal(row.getCell(10)));
      if (quantity === 0 && (basicValue == null || basicValue === 0)) continue;

      const basic = round2(basicValue ?? quantity * rate);
      const date = billDate ?? new Date(Date.UTC(2026, 4, 31));
      const sourceKey = `${SOURCE}:purchase-atcl:${r}`;
      const notes = `Stock from ATCL · ${billNumber ?? "transfer"}`.trim();

      await prisma.purchase.upsert({
        where: { id: sourceKey },
        create: {
          id: sourceKey,
          sourceKey,
          plantId: plant.id,
          date,
          shift: "DAY",
          type: purchaseTypeFromDesc(itemDescription),
          vendorName: "ATCL",
          billNumber,
          billDate,
          itemDescription,
          unit,
          quantity: round4(quantity),
          rate: round4(rate),
          basicValue: basic,
          gstPercent: 0,
          gstAmount: 0,
          invoiceValue: basic,
          notes,
          enteredById,
          isBackdated: true,
        },
        update: {
          date,
          type: purchaseTypeFromDesc(itemDescription),
          vendorName: "ATCL",
          billNumber,
          billDate,
          itemDescription,
          unit,
          quantity: round4(quantity),
          rate: round4(rate),
          basicValue: basic,
          gstPercent: 0,
          gstAmount: 0,
          invoiceValue: basic,
          notes,
        },
      });
      summary.purchases += 1;
    }
  }

  // ─── Misc expenses ───────────────────────────────────────────────────
  {
    const sheet = wb.getWorksheet("Misc Exp.");
    if (!sheet) throw new Error("Misc Exp. sheet missing");
    let lastDate: Date | null = null;
    for (let r = 4; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const payMode = str(cellVal(row.getCell(3)));
      const description = str(cellVal(row.getCell(4)));
      const nature = str(cellVal(row.getCell(5)));
      let payDate = asUtcDate(cellVal(row.getCell(6)));
      const factory = num(cellVal(row.getCell(7))) ?? 0;
      const contractor = num(cellVal(row.getCell(8))) ?? 0;
      const supervisor = num(cellVal(row.getCell(9))) ?? 0;

      if (description.toUpperCase().includes("TOTAL")) break;
      if (!description && !nature && !factory && !contractor && !supervisor) {
        continue;
      }
      // trailing salary total lines without S.No / date
      if (!payDate) payDate = lastDate;
      if (payDate) lastDate = payDate;
      if (!payDate) {
        summary.skipped.push(`misc row ${r}: no date for "${description.slice(0, 40)}"`);
        continue;
      }
      if (!description && factory === 0 && contractor === 0 && supervisor === 0) {
        continue;
      }

      const rawNature = nature || "Other Charges";
      const expenseHead = normalizeUpcastExpenseHead(rawNature);
      const sourceKey = `${SOURCE}:misc:${r}`;
      const desc = description || nature || "Expense";

      const isSalary =
        expenseHead === "Salary Expenses" ||
        (supervisor > 0 && factory === 0 && contractor === 0);
      const isContractor =
        expenseHead === "Contractor Wages" ||
        (contractor > 0 && factory === 0 && supervisor === 0);
      const isMiscDirect = (
        UPCAST_MISC_NATURES as readonly string[]
      ).includes(expenseHead);

      const resolvedHead = isSalary
        ? "Salary Expenses"
        : isContractor
          ? "Contractor Wages"
          : isMiscDirect
            ? expenseHead
            : expenseHead === "Petty Cash" && supervisor > 0
              ? "Salary Expenses"
              : expenseHead;

      const entryType =
        isSalary || isContractor
          ? PettyCashKind.PETTY_CASH
          : PettyCashKind.EXPENSE;

      await prisma.pettyCashEntry.upsert({
        where: { id: sourceKey },
        create: {
          id: sourceKey,
          sourceKey,
          plantId: plant.id,
          date: payDate,
          shift: "DAY",
          entryType,
          payMode: payMode || "Cash",
          expenseHead: resolvedHead,
          nature: nature || null,
          description: desc,
          amount: round2(factory),
          contractorSalary: round2(contractor),
          supervisorSalary: round2(supervisor),
          enteredById,
          isBackdated: true,
        },
        update: {
          date: payDate,
          entryType,
          payMode: payMode || "Cash",
          expenseHead: resolvedHead,
          nature: nature || null,
          description: desc,
          amount: round2(factory),
          contractorSalary: round2(contractor),
          supervisorSalary: round2(supervisor),
        },
      });
      summary.misc += 1;
    }
  }

  // ─── Closing stock ───────────────────────────────────────────────────
  {
    const sheet = wb.getWorksheet("Electricity, Rent & Stock");
    if (!sheet) throw new Error("ERS sheet missing");
    let stockAsOf: Date | null = null;
    for (let r = 1; r <= 20; r++) {
      const label = str(cellVal(sheet.getRow(r).getCell(5))).toLowerCase();
      if (label.includes("stock value as on")) {
        stockAsOf = asUtcDate(cellVal(sheet.getRow(r).getCell(8)));
        break;
      }
    }
    // Prefer explicit sheet date; fallback to FY opening eve used in Excel.
    const stockDate = stockAsOf ?? new Date(Date.UTC(2026, 2, 31));

    for (let r = 5; r <= 12; r++) {
      const row = sheet.getRow(r);
      const cat = str(cellVal(row.getCell(4))).toUpperCase();
      const itemName = str(cellVal(row.getCell(5))) || str(cellVal(row.getCell(6)));
      const unit = str(cellVal(row.getCell(7))) || "KGS";
      const quantity = num(cellVal(row.getCell(8))) ?? 0;
      const rate = num(cellVal(row.getCell(9))) ?? 0;
      const closingValue = num(cellVal(row.getCell(10)));
      if (!itemName || !cat || cat === "STOCK") continue;
      if (quantity === 0 && (closingValue == null || closingValue === 0)) continue;

      const category =
        cat === "WIP" ? StockCategory.WIP : cat === "FG" ? StockCategory.FG : StockCategory.RM;
      const value = round2(closingValue ?? quantity * rate);
      const sourceKey = `${SOURCE}:stock:${r}`;

      await prisma.stockEntry.upsert({
        where: { id: sourceKey },
        create: {
          id: sourceKey,
          plantId: plant.id,
          date: stockDate,
          shift: "DAY",
          itemName,
          category,
          unit: unit.toLowerCase() === "kgs" ? "kg" : unit,
          quantity: round4(quantity),
          rate: round4(rate),
          closingValue: value,
          notes: `Closing stock as on ${stockDate.toISOString().slice(0, 10)}`,
          enteredById,
          isBackdated: true,
        },
        update: {
          date: stockDate,
          itemName,
          category,
          unit: unit.toLowerCase() === "kgs" ? "kg" : unit,
          quantity: round4(quantity),
          rate: round4(rate),
          closingValue: value,
          notes: `Closing stock as on ${stockDate.toISOString().slice(0, 10)}`,
        },
      });
      summary.stock += 1;
    }
  }

  // ─── Electricity & Rent ──────────────────────────────────────────────
  {
    const sheet = wb.getWorksheet("Electricity, Rent & Stock");
    if (!sheet) throw new Error("ERS sheet missing");

    // Electricity block rows 18–28
    for (let r = 18; r <= 28; r++) {
      const row = sheet.getRow(r);
      const month = asUtcDate(cellVal(row.getCell(4)));
      if (!month) continue;
      const openingReading = num(cellVal(row.getCell(5)));
      const closingReading = num(cellVal(row.getCell(6)));
      const consumedUnits = num(cellVal(row.getCell(7)));
      const billAmount = num(cellVal(row.getCell(9))) ?? 0;
      const notes = str(cellVal(row.getCell(10))) || null;
      // Skip empty template months with no bill and no readings
      if (
        billAmount === 0 &&
        (openingReading == null || openingReading === 0) &&
        (closingReading == null || closingReading === 0) &&
        (consumedUnits == null || consumedUnits === 0)
      ) {
        continue;
      }

      await prisma.electricityRent.upsert({
        where: {
          plantId_month: { plantId: plant.id, month },
        },
        create: {
          plantId: plant.id,
          month,
          openingReading,
          closingReading,
          consumedUnits,
          billAmount: round2(billAmount),
          rentAmount: 0,
          notes,
        },
        update: {
          openingReading,
          closingReading,
          consumedUnits,
          billAmount: round2(billAmount),
          notes,
        },
      });
      summary.electricity += 1;
    }

    // Rent block rows 35–42 — merge into same ElectricityRent months
    for (let r = 35; r <= 42; r++) {
      const row = sheet.getRow(r);
      const month = asUtcDate(cellVal(row.getCell(5)));
      if (!month) continue;
      const coveredAreaSqft = num(cellVal(row.getCell(6)));
      const rentRatePerSqft = num(cellVal(row.getCell(7)));
      const rentAmount = num(cellVal(row.getCell(8))) ?? 0;
      if (
        rentAmount === 0 &&
        (coveredAreaSqft == null || coveredAreaSqft === 0)
      ) {
        continue;
      }

      await prisma.electricityRent.upsert({
        where: {
          plantId_month: { plantId: plant.id, month },
        },
        create: {
          plantId: plant.id,
          month,
          billAmount: 0,
          rentAmount: round2(rentAmount),
          coveredAreaSqft,
          rentRatePerSqft,
        },
        update: {
          rentAmount: round2(rentAmount),
          coveredAreaSqft,
          rentRatePerSqft,
        },
      });
      summary.electricity += 1;
    }
  }

  // ─── FAR / Fixed assets ──────────────────────────────────────────────
  {
    const sheet = wb.getWorksheet("FAR");
    if (!sheet) throw new Error("FAR sheet missing");
    // Clear previous FAR import for this plant from this source (no sourceKey on FixedAsset)
    const existing = await prisma.fixedAsset.findMany({
      where: { plantId: plant.id },
      select: { id: true, billNumber: true, assetDescription: true },
    });
    // Only delete assets that match our import fingerprint (same bill+desc) on re-run
    for (let r = 4; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const vendor = str(cellVal(row.getCell(3)));
      const assetDescription = str(cellVal(row.getCell(4)));
      const billNumber = str(cellVal(row.getCell(5))) || null;
      const billDate = asUtcDate(cellVal(row.getCell(6)));
      const cost = num(cellVal(row.getCell(7)));
      const gst = num(cellVal(row.getCell(8))) ?? 0;
      const invoiceValue = num(cellVal(row.getCell(9)));
      const dep = num(cellVal(row.getCell(13))) ?? 0;

      if (assetDescription.toUpperCase().includes("TOTAL")) break;
      if (!assetDescription || !vendor) continue;
      if (cost == null && invoiceValue == null) continue;

      const costVal = round2(cost ?? (invoiceValue != null ? invoiceValue - gst : 0));
      const gstVal = round2(gst);
      const invVal =
        invoiceValue != null ? round2(invoiceValue) : round2(costVal + gstVal);

      const match = existing.find(
        (a) =>
          a.billNumber === billNumber &&
          a.assetDescription === assetDescription,
      );

      if (match) {
        await prisma.fixedAsset.update({
          where: { id: match.id },
          data: {
            vendor,
            billDate,
            cost: costVal,
            gst: gstVal,
            invoiceValue: invVal,
            depreciationPercent: round2(dep),
          },
        });
      } else {
        await prisma.fixedAsset.create({
          data: {
            plantId: plant.id,
            assetDescription,
            vendor,
            billNumber,
            billDate,
            cost: costVal,
            gst: gstVal,
            invoiceValue: invVal,
            depreciationPercent: round2(dep),
          },
        });
      }
      summary.assets += 1;
    }
  }

  // Keep unloading rate aligned with Excel (₹70/MT)
  await prisma.plant.update({
    where: { id: plant.id },
    data: { unloadingRatePerMT: 70 },
  });

  const counts = {
    sale: await prisma.sale.count({ where: { plantId: plant.id } }),
    purchase: await prisma.purchase.count({ where: { plantId: plant.id } }),
    petty: await prisma.pettyCashEntry.count({ where: { plantId: plant.id } }),
    stock: await prisma.stockEntry.count({ where: { plantId: plant.id } }),
    elec: await prisma.electricityRent.count({ where: { plantId: plant.id } }),
    far: await prisma.fixedAsset.count({ where: { plantId: plant.id } }),
  };

  const purchaseSum = await prisma.purchase.aggregate({
    where: { plantId: plant.id },
    _sum: { basicValue: true, quantity: true },
  });
  const saleSum = await prisma.sale.aggregate({
    where: { plantId: plant.id },
    _sum: { salesValue: true, quantity: true },
  });
  const stockSum = await prisma.stockEntry.aggregate({
    where: { plantId: plant.id },
    _sum: { closingValue: true },
  });

  console.log("Import summary (written this run):", summary);
  console.log("DB counts for UPCAST:", counts);
  console.log("Purchase basic total:", Number(purchaseSum._sum.basicValue));
  console.log("Purchase qty total:", Number(purchaseSum._sum.quantity));
  console.log("Sales value total:", Number(saleSum._sum.salesValue));
  console.log("Sales qty total:", Number(saleSum._sum.quantity));
  console.log("Stock closing total:", Number(stockSum._sum.closingValue));
  console.log("Excel expected purchase basic ~23655474.5 qty ~19313.9");
  console.log("Excel expected sales basic ~3154920 qty ~2586");
  console.log("Excel expected stock ~12782511.9");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
