import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { GlobalRole, ManpowerRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { listPlantSeeds } from "../src/lib/plant-segments";

async function main() {
  const email = (
    process.env.SUPER_ADMIN_EMAIL ?? "ashishu703@gmail.com"
  )
    .toLowerCase()
    .trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD must be set to seed Super Admin");
  }

  const PLANTS = listPlantSeeds();

  const plants = [];
  for (const entry of PLANTS) {
    plants.push(
      await prisma.plant.upsert({
        where: { code: entry.code },
        update: { name: entry.name, isActive: true },
        create: { name: entry.name, code: entry.code, isActive: true },
      }),
    );
  }

  const plant = plants.find((p) => p.code === "CAT6") ?? plants[0]!;

  const rateRows: { role: ManpowerRole; ratePerDay: number }[] = [
    { role: ManpowerRole.MANAGER, ratePerDay: 4000 },
    { role: ManpowerRole.OPERATOR, ratePerDay: 1500 },
    { role: ManpowerRole.HELPER, ratePerDay: 800 },
  ];

  for (const target of plants) {
    for (const row of rateRows) {
      await prisma.manpowerRateSetting.upsert({
        where: {
          plantId_role: {
            plantId: target.id,
            role: row.role,
          },
        },
        update: {
          ratePerDay: row.ratePerDay,
        },
        create: {
          plantId: target.id,
          role: row.role,
          ratePerDay: row.ratePerDay,
        },
      });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Super Admin",
      passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      canViewPriceSheet: true,
      isActive: true,
      creditScore: 100,
    },
    create: {
      email,
      name: "Super Admin",
      passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      canViewPriceSheet: true,
      isActive: true,
      creditScore: 100,
    },
  });

  await prisma.userPlantRole.upsert({
    where: {
      userId_plantId: {
        userId: admin.id,
        plantId: plant.id,
      },
    },
    update: {
      role: GlobalRole.SUPER_ADMIN,
    },
    create: {
      userId: admin.id,
      plantId: plant.id,
      role: GlobalRole.SUPER_ADMIN,
    },
  });

  const managerEmail = (
    process.env.PLANT_MANAGER_EMAIL ?? "manager@cat6.local"
  )
    .toLowerCase()
    .trim();
  const managerPassword = process.env.PLANT_MANAGER_PASSWORD ?? password;
  const managerHash = await bcrypt.hash(managerPassword, 12);

  const managerPhone = process.env.PLANT_MANAGER_PHONE?.trim() || null;

  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: {
      name: "Plant Manager",
      passwordHash: managerHash,
      globalRole: GlobalRole.PLANT_MANAGER,
      canViewPriceSheet: false,
      isActive: true,
      ...(managerPhone ? { phone: managerPhone } : {}),
    },
    create: {
      email: managerEmail,
      name: "Plant Manager",
      passwordHash: managerHash,
      globalRole: GlobalRole.PLANT_MANAGER,
      canViewPriceSheet: false,
      isActive: true,
      phone: managerPhone,
    },
  });

  await prisma.userPlantRole.upsert({
    where: {
      userId_plantId: {
        userId: manager.id,
        plantId: plant.id,
      },
    },
    update: {
      role: GlobalRole.PLANT_MANAGER,
    },
    create: {
      userId: manager.id,
      plantId: plant.id,
      role: GlobalRole.PLANT_MANAGER,
    },
  });

  const supervisorEmail = (
    process.env.MACHINE_SUPERVISOR_EMAIL ?? "supervisor@machine.local"
  )
    .toLowerCase()
    .trim();
  const supervisorPassword =
    process.env.MACHINE_SUPERVISOR_PASSWORD ?? password;
  const supervisorHash = await bcrypt.hash(supervisorPassword, 12);

  const supervisor = await prisma.user.upsert({
    where: { email: supervisorEmail },
    update: {
      name: "Machine Supervisor",
      passwordHash: supervisorHash,
      globalRole: GlobalRole.MACHINE_SUPERVISOR,
      canViewPriceSheet: false,
      isActive: true,
    },
    create: {
      email: supervisorEmail,
      name: "Machine Supervisor",
      passwordHash: supervisorHash,
      globalRole: GlobalRole.MACHINE_SUPERVISOR,
      canViewPriceSheet: false,
      isActive: true,
    },
  });

  const defaultMachines = [
    { code: "EXT-01", name: "Extruder 01", description: "Main line extruder" },
    { code: "EXT-02", name: "Extruder 02", description: "Secondary extruder" },
    { code: "TW-01", name: "Twister 01", description: "Pair twisting" },
    { code: "SH-01", name: "Sheathing 01", description: "Outer sheathing" },
  ];

  for (const m of defaultMachines) {
    await prisma.machine.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        description: m.description,
        isActive: true,
      },
      create: {
        code: m.code,
        name: m.name,
        description: m.description,
        isActive: true,
      },
    });
  }

  // Processes stay machine-wise and are managed only in Admin (not seeded).

  const defaultCableTypes = [
    "CAT6",
    "CAT6A",
    "Coaxial",
    "Power",
    "Fiber",
    "8.0 mm Copper Rod",
    "12.5 mm copper Rod",
    "Others",
  ];
  const defaultCableSizes = [
    "0.5 sqmm",
    "0.75 sqmm",
    "1.0 sqmm",
    "1.5 sqmm",
    "2.5 sqmm",
    "23 AWG",
    "24 AWG",
    "Others",
  ];

  let typeSort = 10;
  for (const name of defaultCableTypes) {
    const type = await prisma.machineCableType.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, sortOrder: typeSort, isActive: true },
    });
    typeSort += 10;

    let sizeSort = 10;
    for (const sizeName of defaultCableSizes) {
      await prisma.machineCableSize.upsert({
        where: {
          cableTypeId_name: { cableTypeId: type.id, name: sizeName },
        },
        update: { isActive: true },
        create: {
          cableTypeId: type.id,
          name: sizeName,
          sortOrder: sizeSort,
          isActive: true,
        },
      });
      sizeSort += 10;
    }
  }

  console.log("Seed complete:");
  for (const target of plants) {
    console.log(`  Plant: ${target.name} (${target.code}) id=${target.id}`);
  }
  console.log(`  Super Admin: ${admin.email} id=${admin.id}`);
  console.log(`  Plant Manager: ${manager.email} id=${manager.id}`);
  console.log(
    `  Machine Supervisor: ${supervisor.email} id=${supervisor.id}`,
  );
  console.log("  Manpower rates: Manager 4000 / Operator 1500 / Helper 800");
  console.log(`  Machines seeded: ${defaultMachines.length}`);
  console.log("  Processes: none (add per machine in Admin)");
  console.log(
    `  Cable: ${defaultCableTypes.length} types × ${defaultCableSizes.length} sizes each`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
