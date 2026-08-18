import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { prisma } from "../src/lib/db";

const METER_11_TO_31_MAR = 14_028;
const MAR_PRODUCTION_KG = 59_463;
const TOTAL_PRODUCTION_TILL_31_MAR = 148_733;
const FEB_AVG_RATE = 8.83;
const EXPECTED_PROVISIONAL_READING = 35_087.81;
const EXPECTED_MAR_BILL = 309_825.37;
const EXPECTED_TOTAL_BILL = 1_191_282.75;

type ElecRow = {
  month: string;
  openingReading: number | null;
  closingReading: number | null;
  consumedUnits: number | null;
  avgRate: number | null;
  billAmount: number;
  rentAmount: number;
  coveredAreaSqft: number | null;
  rentRatePerSqft: number;
  notes: string | null;
};

const ELECTRICITY_SEED: ElecRow[] = [
  {
    month: "2026-01",
    openingReading: null,
    closingReading: null,
    consumedUnits: null,
    avgRate: null,
    billAmount: 0,
    rentAmount: 0,
    coveredAreaSqft: 0,
    rentRatePerSqft: 12,
    notes: "0 SQFT @ 12.00",
  },
  {
    month: "2026-02",
    openingReading: null,
    closingReading: null,
    consumedUnits: null,
    avgRate: null,
    billAmount: 0,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes:
      "Electricity meter for the PVC plant was installed late on 11 Mar",
  },
  {
    month: "2026-03",
    openingReading: null,
    closingReading: null,
    consumedUnits: null,
    avgRate: FEB_AVG_RATE,
    billAmount: EXPECTED_MAR_BILL,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes:
      "Power supply is presently functioning on a provisional basis. 11 Mar–31 Mar meter 14,028 units on 59,463 kg = 0.236 kWh/kg. Total production till 31-03-26 148,733 kg → provisional 35,087.81 units × 8.83 = 309,825.37",
  },
  {
    month: "2026-04",
    openingReading: 22_375,
    closingReading: 39_180,
    consumedUnits: 16_805,
    avgRate: 10.26,
    billAmount: 172_430.38,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes: null,
  },
  {
    month: "2026-05",
    openingReading: 39_180,
    closingReading: 56_655,
    consumedUnits: 17_475,
    avgRate: 11,
    billAmount: 192_225,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes: "Provisional Rate",
  },
  {
    month: "2026-06",
    openingReading: 56_655,
    closingReading: 76_590,
    consumedUnits: 19_935,
    avgRate: 11,
    billAmount: 219_285,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes: null,
  },
  {
    month: "2026-07",
    openingReading: 76_590,
    closingReading: 100_683,
    consumedUnits: 24_093,
    avgRate: 11,
    billAmount: 265_023,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes: null,
  },
  {
    month: "2026-08",
    openingReading: 100_683,
    closingReading: 103_637,
    consumedUnits: 2_954,
    avgRate: 11,
    billAmount: 32_494,
    rentAmount: 24_000,
    coveredAreaSqft: 2_000,
    rentRatePerSqft: 12,
    notes: "Till 05-08-26",
  },
];

/** Register rows with Rate 12 and blank Covered Area / Rent Exp. */
const FUTURE_RENT_MONTHS = [
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
  "2027-01",
  "2027-02",
  "2027-03",
] as const;

function parseMonth(month: string): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error(`Invalid month: ${month}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function verifyCalculations() {
  const kwhPerKg = METER_11_TO_31_MAR / MAR_PRODUCTION_KG;
  if (Math.abs(kwhPerKg - 0.236) > 0.001) {
    throw new Error(`kWh/kg ${kwhPerKg} is not ~0.236`);
  }
  const provisional =
    (TOTAL_PRODUCTION_TILL_31_MAR * METER_11_TO_31_MAR) / MAR_PRODUCTION_KG;
  if (Math.abs(round2(provisional) - EXPECTED_PROVISIONAL_READING) > 0.01) {
    throw new Error(
      `Provisional reading ${provisional} != ${EXPECTED_PROVISIONAL_READING}`,
    );
  }
  const marBill = round2(EXPECTED_PROVISIONAL_READING * FEB_AVG_RATE);
  if (Math.abs(marBill - EXPECTED_MAR_BILL) > 0.02) {
    throw new Error(`Mar bill ${marBill} != ${EXPECTED_MAR_BILL}`);
  }

  for (const row of ELECTRICITY_SEED) {
    if (
      row.openingReading != null &&
      row.closingReading != null &&
      row.consumedUnits != null
    ) {
      const consumed = round2(row.closingReading - row.openingReading);
      if (Math.abs(consumed - row.consumedUnits) > 0.01) {
        throw new Error(
          `${row.month} consumed ${row.consumedUnits} != ${consumed}`,
        );
      }
    }
    if (row.consumedUnits != null && row.avgRate != null && row.billAmount > 0) {
      const computed = round2(row.consumedUnits * row.avgRate);
      if (Math.abs(computed - row.billAmount) > 12) {
        throw new Error(
          `${row.month} bill ${row.billAmount} != ${row.consumedUnits}*${row.avgRate}=${computed}`,
        );
      }
    }
  }

  const billTotal = round2(
    ELECTRICITY_SEED.reduce((sum, r) => sum + r.billAmount, 0),
  );
  if (Math.abs(billTotal - EXPECTED_TOTAL_BILL) > 0.01) {
    throw new Error(`Bill total ${billTotal} != ${EXPECTED_TOTAL_BILL}`);
  }
}

async function main() {
  verifyCalculations();

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ElectricityRent" ADD COLUMN IF NOT EXISTS "coveredAreaSqft" DECIMAL(18,2)`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ElectricityRent" ADD COLUMN IF NOT EXISTS "rentRatePerSqft" DECIMAL(18,4)`,
  );

  const plant = await prisma.plant.findUnique({
    where: { code: "PVC" },
    select: { id: true, name: true },
  });
  if (!plant) throw new Error("PVC plant does not exist");

  const months = ELECTRICITY_SEED.map((r) => parseMonth(r.month));

  const deletedPetty = await prisma.pettyCashEntry.deleteMany({
    where: {
      plantId: plant.id,
      OR: [
        { expenseHead: { equals: "Electricity", mode: "insensitive" } },
        { payMode: { equals: "Electricity", mode: "insensitive" } },
      ],
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.electricityRent.deleteMany({
      where: { plantId: plant.id, month: { in: months } },
    });
    await tx.electricityRent.createMany({
      data: ELECTRICITY_SEED.map((row) => ({
        plantId: plant.id,
        month: parseMonth(row.month),
        openingReading: row.openingReading,
        closingReading: row.closingReading,
        consumedUnits: row.consumedUnits,
        billAmount: row.billAmount,
        rentAmount: row.rentAmount,
        coveredAreaSqft: row.coveredAreaSqft,
        rentRatePerSqft: row.rentRatePerSqft,
        notes: row.notes,
      })),
    });
  });

  for (const month of FUTURE_RENT_MONTHS) {
    const monthDate = parseMonth(month);
    const existing = await prisma.electricityRent.findUnique({
      where: { plantId_month: { plantId: plant.id, month: monthDate } },
    });
    if (existing) {
      await prisma.electricityRent.update({
        where: { id: existing.id },
        data: {
          coveredAreaSqft: null,
          rentRatePerSqft: 12,
          rentAmount: 0,
        },
      });
    } else {
      await prisma.electricityRent.create({
        data: {
          plantId: plant.id,
          month: monthDate,
          billAmount: 0,
          rentAmount: 0,
          coveredAreaSqft: null,
          rentRatePerSqft: 12,
        },
      });
    }
  }

  const check = await prisma.electricityRent.aggregate({
    where: { plantId: plant.id, month: { in: months } },
    _count: true,
    _sum: { billAmount: true, rentAmount: true },
  });
  const billTotal = Number(check._sum.billAmount);
  if (check._count !== ELECTRICITY_SEED.length) {
    throw new Error(`DB month count ${check._count} != ${ELECTRICITY_SEED.length}`);
  }
  if (Math.abs(billTotal - EXPECTED_TOTAL_BILL) > 0.01) {
    throw new Error(`DB bill ${billTotal} != ${EXPECTED_TOTAL_BILL}`);
  }

  console.log(`PVC electricity replaced in ${plant.name}`);
  console.log(`  Deleted petty-cash electricity rows: ${deletedPetty.count}`);
  console.log(`  Months seeded: ${check._count}`);
  console.log(`  Electricity bills: ${billTotal.toLocaleString("en-IN")}`);
  console.log(
    `  Rent (Jan–Aug): ${Number(check._sum.rentAmount).toLocaleString("en-IN")}`,
  );
  console.log(
    `  Mar bill from 11 Mar–31 Mar meter: ${METER_11_TO_31_MAR.toLocaleString("en-IN")} units / ${MAR_PRODUCTION_KG.toLocaleString("en-IN")} kg = 0.236 kWh/kg`,
  );
  console.log(
    `  Provisional 148,733 kg → ${EXPECTED_PROVISIONAL_READING.toLocaleString("en-IN")} × ${FEB_AVG_RATE} = ${EXPECTED_MAR_BILL.toLocaleString("en-IN")}`,
  );
}

main()
  .catch((error) => {
    console.error("PVC electricity seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
