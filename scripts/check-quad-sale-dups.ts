import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env"), override: true });

import { prisma } from "../src/lib/db";

async function main() {
  const quad = await prisma.plant.findFirst({
    where: { code: "QUAD" },
    select: { id: true },
  });
  const sig = await prisma.plant.findFirst({
    where: { code: "SIGNALLING" },
    select: { id: true },
  });
  if (!quad) throw new Error("no QUAD");

  const ids = [quad.id, ...(sig ? [sig.id] : [])];
  const sales = await prisma.sale.findMany({
    where: { plantId: { in: ids } },
    select: {
      id: true,
      date: true,
      customerName: true,
      billNumber: true,
      itemDescription: true,
      quantity: true,
      rate: true,
      sourceKey: true,
      plantId: true,
      createdAt: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  console.log("total sales on QUAD+SIG:", sales.length);
  console.log(
    "on QUAD:",
    sales.filter((s) => s.plantId === quad.id).length,
  );
  if (sig) {
    console.log(
      "still on SIGNALLING:",
      sales.filter((s) => s.plantId === sig.id).length,
    );
  }

  const map = new Map<string, typeof sales>();
  for (const s of sales) {
    const k = [
      s.date.toISOString().slice(0, 10),
      (s.customerName || "").toLowerCase().trim(),
      (s.billNumber || "").toLowerCase().trim(),
      (s.itemDescription || "").toLowerCase().trim(),
      Number(s.quantity),
      Number(s.rate),
    ].join("|");
    const list = map.get(k) ?? [];
    list.push(s);
    map.set(k, list);
  }

  const dups = [...map.entries()].filter(([, v]) => v.length > 1);
  console.log("duplicate content groups:", dups.length);
  console.log(
    "extra duplicate rows:",
    dups.reduce((a, [, v]) => a + v.length - 1, 0),
  );

  for (const [k, v] of dups.slice(0, 10)) {
    console.log("---", k.slice(0, 120));
    for (const s of v) {
      console.log(
        " ",
        s.plantId === quad.id ? "QUAD" : "SIG",
        s.createdAt.toISOString().slice(0, 19),
        (s.sourceKey || s.id).slice(0, 48),
      );
    }
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
