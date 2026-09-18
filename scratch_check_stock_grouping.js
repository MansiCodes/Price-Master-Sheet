process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const plants = await prisma.plant.findMany({});
  for (const p of plants) {
    console.log(`\n=== PLANT: ${p.name} (${p.code}) ===`);
    const entries = await prisma.stockEntry.findMany({
      where: { plantId: p.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });
    
    // Group entries by date
    const byDate = {};
    for (const e of entries) {
      const d = e.date.toISOString().slice(0, 10);
      byDate[d] = byDate[d] || [];
      byDate[d].push(e);
    }

    const dates = Object.keys(byDate).sort().reverse();
    console.log(`Unique dates: ${dates.length}`);
    for (const d of dates.slice(0, 5)) {
      const rows = byDate[d];
      const sum = rows.reduce((s, x) => s + Number(x.closingValue || 0), 0);
      console.log(`  Date ${d}: ${rows.length} rows, Total sum: ${sum}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect().then(() => pool.end()));
