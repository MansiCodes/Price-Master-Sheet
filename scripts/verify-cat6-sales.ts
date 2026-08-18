import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/db";

async function main() {
  const plant = await prisma.plant.findUnique({
    where: { code: "CAT6" },
    select: { id: true },
  });
  if (!plant) throw new Error("CAT6 plant missing");

  const all = await prisma.sale.aggregate({
    where: { plantId: plant.id },
    _count: true,
    _sum: { salesValue: true },
  });
  const report = await prisma.sale.aggregate({
    where: {
      plantId: plant.id,
      NOT: { sourceKey: { endsWith: "sales-online:excel" } },
    },
    _count: true,
    _sum: { salesValue: true },
  });
  const withMeter = await prisma.sale.count({
    where: { plantId: plant.id, inMeter: { not: null } },
  });

  console.log("All sales (incl online):", {
    count: all._count,
    total: Number(all._sum.salesValue),
  });
  console.log("Sales report (excl online):", {
    count: report._count,
    total: Number(report._sum.salesValue),
  });
  console.log("Rows with In Meter:", withMeter);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
