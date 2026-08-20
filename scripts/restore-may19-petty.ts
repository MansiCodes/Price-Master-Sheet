import "dotenv/config";
import { PettyCashKind } from "@prisma/client";
import { prisma } from "../src/lib/db";

/** Restore CAT6 19-May-2026 petty cash row from Noto Excel Petty Cash sheet row 127. */
async function main() {
  const plant = await prisma.plant.findFirst({
    where: { code: "CAT6" },
    select: { id: true },
  });
  if (!plant) {
    throw new Error("CAT6 plant not found");
  }

  const description =
    "SALARY AMOUNT PAID TO SHAURAB RANA (CAT 6) ATC0713 FOR THE MONTH OF APRIL";
  const date = new Date("2026-05-19T00:00:00.000Z");
  const sourceKey = "cat6-excel-petty-2026-05-19-shaura-rana-1950";

  const existing = await prisma.pettyCashEntry.findFirst({
    where: {
      plantId: plant.id,
      OR: [
        { sourceKey },
        {
          date,
          amount: 1950,
          description: { contains: "SHAURAB", mode: "insensitive" },
        },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    console.log("Already present:", existing.id);
    return;
  }

  const enteredBy = await prisma.user.findFirst({ select: { id: true } });
  if (!enteredBy) {
    throw new Error("No user found to set enteredById");
  }

  const created = await prisma.pettyCashEntry.create({
    data: {
      sourceKey,
      plantId: plant.id,
      date,
      entryType: PettyCashKind.PETTY_CASH,
      payMode: "CASH",
      expenseHead: "Petty Cash",
      nature: "SALARY & WAGES",
      description,
      location: "ATC BHAGWANPUR",
      checkedBy: "VIPIN",
      approvedBy: "ASHOK SIR",
      amount: 1950,
      contractorSalary: 0,
      supervisorSalary: 0,
      enteredById: enteredBy.id,
      isBackdated: true,
    },
    select: { id: true, date: true, amount: true, nature: true },
  });

  console.log("Restored:", created);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
