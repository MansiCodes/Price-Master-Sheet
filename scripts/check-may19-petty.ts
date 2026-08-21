import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const plant = await prisma.plant.findFirst({
    where: { code: "CAT6" },
    select: { id: true, name: true, code: true },
  });
  console.log("plant", plant);
  if (!plant) return;

  const rows = await prisma.pettyCashEntry.findMany({
    where: {
      plantId: plant.id,
      date: new Date("2026-05-19T00:00:00.000Z"),
    },
    select: {
      id: true,
      entryType: true,
      nature: true,
      description: true,
      amount: true,
      expenseHead: true,
      payMode: true,
      location: true,
      checkedBy: true,
      approvedBy: true,
    },
  });
  console.log("may19 count", rows.length);
  console.log(JSON.stringify(rows, null, 2));

  const sha = await prisma.pettyCashEntry.findMany({
    where: {
      plantId: plant.id,
      description: { contains: "SHAURAB", mode: "insensitive" },
    },
    select: {
      id: true,
      date: true,
      amount: true,
      description: true,
      entryType: true,
      nature: true,
    },
  });
  console.log("shaura count", sha.length);
  console.log(JSON.stringify(sha, null, 2));

  const anyUser = await prisma.user.findFirst({ select: { id: true } });
  console.log("hasUser", Boolean(anyUser?.id));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
