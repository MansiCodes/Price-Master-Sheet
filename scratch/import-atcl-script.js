const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('c:/Users/Admin/Downloads/ATCL_PVC Plant P&L-V1 (2).xlsx');
  const ws = wb.getWorksheet('Purchase');
  
  const pvcPlant = await prisma.plant.findFirst({
    where: { code: 'PVC' }
  });
  
  if (!pvcPlant) {
    console.error('PVC Plant not found');
    return;
  }
  console.log('Found PVC Plant ID:', pvcPlant.id);
  
  const rows = [];
  ws.eachRow((row, r) => {
    if (r < 5) return;
    const vals = [];
    row.eachCell({ includeEmpty: true }, (c, col) => {
      let v = c.value;
      if (v && typeof v === 'object') v = v.result ?? v.text ?? v;
      vals[col] = v;
    });

    const sNo = vals[2];
    const supplier = vals[3] ? String(vals[3]).trim() : '';
    const item = vals[4] ? String(vals[4]).trim() : '';
    const billNo = vals[5] ? String(vals[5]).trim() : '';
    const dateRaw = vals[6];
    const unit = vals[7] ? String(vals[7]).trim() : 'KGS';
    const qty = Number(vals[8]) || 0;
    const rate = Number(vals[9]) || 0;
    const basic = Number(vals[10]) || 0;
    const gst = Number(vals[11]) || 0;
    const invoiceVal = Number(vals[12]) || 0;
    const remarks = vals[13] ? String(vals[13]).trim() : '';

    if (!supplier && !item && !billNo && qty === 0) return;

    let billDate = new Date();
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) billDate = d;
    }

    rows.push({
      r,
      sNo,
      supplier,
      item,
      billNo,
      billDate: billDate.toISOString(),
      unit,
      qty,
      rate,
      basic,
      gst,
      invoiceVal,
      remarks
    });
  });

  console.log('Total parsed rows:', rows.length);

  const atclRows = rows.filter(r => 
    r.billNo.toUpperCase().includes('ATCL') || 
    r.supplier.toUpperCase().includes('ATCL') || 
    r.remarks.toUpperCase().includes('ATCL')
  );

  console.log('ATCL Rows count:', atclRows.length);
  console.log('ATCL Rows details:', JSON.stringify(atclRows, null, 2));
}

main().then(() => prisma['']()).catch(err => {
  console.error(err);
  prisma['']();
});
