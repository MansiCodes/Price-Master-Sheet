import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env"), override: true });

import { prisma } from "../src/lib/db";

type Row = {
  id: string;
  date: Date;
  createdAt: Date;
  sourceKey: string | null;
};

function contentKey(parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) =>
      p == null
        ? ""
        : typeof p === "number"
          ? String(p)
          : String(p).toLowerCase().trim(),
    )
    .join("|");
}

/** Keep oldest createdAt; delete the rest. */
function pickDeletes(group: Row[]): string[] {
  const sorted = [...group].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return sorted.slice(1).map((r) => r.id);
}

async function main() {
  const dry = process.argv.includes("--dry");
  const quad = await prisma.plant.findFirst({
    where: { code: "QUAD" },
    select: { id: true },
  });
  const sig = await prisma.plant.findFirst({
    where: { code: "SIGNALLING" },
    select: { id: true },
  });
  if (!quad) throw new Error("QUAD plant not found");
  const plantIds = [quad.id, ...(sig ? [sig.id] : [])];

  // --- Sales ---
  const sales = await prisma.sale.findMany({
    where: { plantId: { in: plantIds } },
    select: {
      id: true,
      date: true,
      createdAt: true,
      sourceKey: true,
      customerName: true,
      billNumber: true,
      itemDescription: true,
      quantity: true,
      rate: true,
    },
  });
  const saleMap = new Map<string, Row[]>();
  for (const s of sales) {
    const k = contentKey([
      s.date.toISOString().slice(0, 10),
      s.customerName,
      s.billNumber,
      s.itemDescription,
      Number(s.quantity),
      Number(s.rate),
    ]);
    const list = saleMap.get(k) ?? [];
    list.push(s);
    saleMap.set(k, list);
  }
  const saleDeletes = [...saleMap.values()]
    .filter((g) => g.length > 1)
    .flatMap(pickDeletes);

  // --- Purchases ---
  const purchases = await prisma.purchase.findMany({
    where: { plantId: { in: plantIds } },
    select: {
      id: true,
      date: true,
      createdAt: true,
      sourceKey: true,
      vendorName: true,
      billNumber: true,
      itemDescription: true,
      quantity: true,
      rate: true,
    },
  });
  const purchaseMap = new Map<string, Row[]>();
  for (const p of purchases) {
    const k = contentKey([
      p.date.toISOString().slice(0, 10),
      p.vendorName,
      p.billNumber,
      p.itemDescription,
      Number(p.quantity),
      Number(p.rate),
    ]);
    const list = purchaseMap.get(k) ?? [];
    list.push(p);
    purchaseMap.set(k, list);
  }
  const purchaseDeletes = [...purchaseMap.values()]
    .filter((g) => g.length > 1)
    .flatMap(pickDeletes);

  console.log("sales total:", sales.length, "delete:", saleDeletes.length);
  console.log(
    "purchases total:",
    purchases.length,
    "delete:",
    purchaseDeletes.length,
  );

  if (dry) {
    console.log("dry run — no deletes");
    return;
  }

  if (saleDeletes.length) {
    const r = await prisma.sale.deleteMany({
      where: { id: { in: saleDeletes } },
    });
    console.log("deleted sales:", r.count);
  }
  if (purchaseDeletes.length) {
    const r = await prisma.purchase.deleteMany({
      where: { id: { in: purchaseDeletes } },
    });
    console.log("deleted purchases:", r.count);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
