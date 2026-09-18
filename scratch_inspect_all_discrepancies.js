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
  console.log('=== 1. SL SSL SALES ===');
  const slssl = await prisma.plant.findFirst({ where: { code: 'SLSSL' } });
  const slsales = await prisma.sale.findMany({ where: { plantId: slssl.id } });
  let slTotal = 0;
  let slNonRejected = 0;
  let slApproved = 0;
  for (const s of slsales) {
    const val = Number(s.salesValue);
    slTotal += val;
    if (!s.rejectedByHead) slNonRejected += val;
    if (s.approvedByHead || s.approvedByAdmin) slApproved += val;
  }
  console.log(`SL SSL Total Sales (${slsales.length} rows): ${slTotal}`);
  console.log(`SL SSL Non-rejected Sales: ${slNonRejected}`);
  console.log(`SL SSL Approved Sales: ${slApproved}`);

  console.log('\n=== 2. ROPE LIGHT PURCHASES ===');
  const rope = await prisma.plant.findFirst({ where: { code: 'LEDROPE' } });
  const ropePurchases = await prisma.purchase.findMany({ where: { plantId: rope.id } });
  let ropeTotalBasic = 0;
  let ropeNonRejectedBasic = 0;
  let ropeApprovedBasic = 0;
  const ropeByType = {};
  for (const p of ropePurchases) {
    const val = Number(p.basicValue);
    ropeTotalBasic += val;
    if (!p.rejectedByHead) ropeNonRejectedBasic += val;
    if (p.approvedByHead || p.approvedByAdmin) ropeApprovedBasic += val;
    ropeByType[p.type] = (ropeByType[p.type] || 0) + val;
  }
  console.log(`Rope Light Total Purchases (${ropePurchases.length} rows): ${ropeTotalBasic}`);
  console.log(`Rope Light Non-rejected Purchases: ${ropeNonRejectedBasic}`);
  console.log(`Rope Light Approved Purchases: ${ropeApprovedBasic}`);
  console.log('Rope Light Purchases by Type:', ropeByType);
  for (const p of ropePurchases) {
    console.log(` - Item: ${p.itemDescription} | type: ${p.type} | basic: ${p.basicValue} | approvedHead: ${p.approvedByHead} | rejectedHead: ${p.rejectedByHead}`);
  }

  console.log('\n=== 3. PVC PURCHASES & SALES ===');
  const pvc = await prisma.plant.findFirst({ where: { code: 'PVC' } });
  const pvcPurchases = await prisma.purchase.findMany({ where: { plantId: pvc.id } });
  let pvcPurTotal = 0, pvcPurNonRej = 0, pvcPurAppr = 0;
  for (const p of pvcPurchases) {
    const val = Number(p.basicValue);
    pvcPurTotal += val;
    if (!p.rejectedByHead) pvcPurNonRej += val;
    if (p.approvedByHead || p.approvedByAdmin) pvcPurAppr += val;
  }
  console.log(`PVC Total Purchases Basic: ${pvcPurTotal} | Non-rejected: ${pvcPurNonRej} | Approved: ${pvcPurAppr}`);

  const pvcSales = await prisma.sale.findMany({ where: { plantId: pvc.id } });
  let pvcSaleTotal = 0, pvcSaleNonRej = 0, pvcSaleAppr = 0;
  for (const s of pvcSales) {
    const val = Number(s.salesValue);
    pvcSaleTotal += val;
    if (!s.rejectedByHead) pvcSaleNonRej += val;
    if (s.approvedByHead || s.approvedByAdmin) pvcSaleAppr += val;
  }
  console.log(`PVC Total Sales: ${pvcSaleTotal} | Non-rejected: ${pvcSaleNonRej} | Approved: ${pvcSaleAppr}`);
}

main().catch(console.error).finally(() => prisma.$disconnect().then(() => pool.end()));
