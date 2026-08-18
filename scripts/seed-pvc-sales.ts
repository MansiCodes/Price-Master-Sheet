import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { ManpowerShift, Prisma, SaleType } from "@prisma/client";
import { prisma } from "../src/lib/db";

const SOURCE_PREFIX = "seed:pvc-outward-aug26:";
const CUSTOMER_NAME = "ATCL";
const EXPECTED_QTY = 547_793;
const EXPECTED_VALUE = 27_127_087;

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

/** notes|challan|date|item|qty|rate|value — cancelled / blank challans omitted */
const RAW_ROWS = `
Rohtas ji (Factory staff)|001|30-Jan-26|RDSO Black|200|46|9200
Sanjay ji (Factory staff)|002|30-Jan-26|RDSO Black|350|46|16100
Sanjay ji (Factory staff)|003|31-Jan-26|RDSO Black|1260|46|57960
Ankit ji (Production)|004|1-Feb-26|RDSO Black|315|46|14490
Sitaram (Operator)|005|2-Feb-26|RDSO Black|525|46|24150
Sitaram (Operator)|006|2-Feb-26|RDSO Black|350|46|16100
Sitaram (Operator)|007|3-Feb-26|RDSO Black|350|46|16100
Sitaram (Operator)|008|3-Feb-26|RDSO Black|525|46|24150
Sitaram (Operator)|009|5-Feb-26|RDSO Black|350|46|16100
Sitaram (Operator)|010|5-Feb-26|RDSO Black|700|46|32200
Sitaram (Operator)|011|6-Feb-26|RDSO Black|400|46|18400
Chandramani (Operator)|012|6-Feb-26|RDSO Black|600|46|27600
Sitaram (Operator)|013|7-Feb-26|RDSO Black|350|46|16100
Chandramani (Operator)|014|7-Feb-26|RDSO Black|525|46|24150
Pankaj ji (Stock)|015|7-Feb-26|RDSO Black|4235|46|194810
Pankaj ji (Stock)|016|9-Feb-26|RDSO Black|2800|46|128800
Pankaj ji (Stock)|017|10-Feb-26|RDSO Black|3500|46|161000
Pankaj ji (Stock)|018|11-Feb-26|RDSO Black|2135|46|98210
Pankaj ji (Stock)|019|13-Feb-26|RDSO Black|2275|46|104650
Pankaj ji (Stock)|020|14-Feb-26|RDSO Black|4900|46|225400
Pankaj ji (Stock)|021|16-Feb-26|RDSO Black|2100|46|96600
Pankaj ji (Stock)|022|17-Feb-26|RDSO Black|2800|46|128800
Pankaj ji (Stock)|023|19-Feb-26|RDSO Black|5845|46|268870
Pankaj ji (Stock)|024|20-Feb-26|RDSO Black|3000|46|138000
Pankaj ji (Stock)|025|21-Feb-26|RDSO Black|5880|46|270480
Pankaj ji (Stock)|026|23-Feb-26|RDSO Black|1280|46|58880
Pankaj ji (Stock)|027|24-Feb-26|RDSO Black|7200|46|331200
Pankaj ji (Stock)|029|25-Feb-26|RDSO Black|5600|46|257600
Pankaj ji (Stock)|030|26-Feb-26|RDSO Black|4000|46|184000
Pankaj ji (Stock)|031|26-Feb-26|RDSO Grey|360|48|17280
Pankaj ji (Stock)|032|27-Feb-26|RDSO Black|600|46|27600
Pankaj ji (Stock)|033|28-Feb-26|RDSO Black|1720|46|79120
Pankaj ji (Stock)|034|28-Feb-26|RDSO Black|1680|46|77280
Pankaj ji (Stock)|035|28-Feb-26|RDSO Black|800|46|36800
Pankaj ji (Stock)|036|2-Mar-26|RDSO Black|1200|46|55200
Pankaj ji (Stock)|037|5-Mar-26|RDSO Black|2880|46|132480
Pankaj ji (Stock)|038|5-Mar-26|RDSO Grey|1200|49|58800
Pankaj ji (Stock)|039|7-Mar-26|RDSO Black|1000|46|46000
Pankaj ji (Stock)|040|8-Mar-26|RDSO Black|1400|46|64400
Pankaj ji (Stock)|041|9-Mar-26|RDSO Grey|4000|49|196000
Pankaj ji (Stock)|042|9-Mar-26|RDSO Black|2400|46|110400
Pankaj ji (Stock)|043|9-Mar-26|RDSO Black|800|46|36800
Pankaj ji (Stock)|044|10-Mar-26|RDSO Black|3840|46|176640
Pankaj ji (Stock)|045|10-Mar-26|RDSO Grey|1040|49|50960
Pankaj ji (Stock)|046|11-Mar-26|RDSO Black|5280|46|242880
Pankaj ji (Stock)|047|12-Mar-26|RDSO Black|2920|46|134320
Pankaj ji (Stock)|048|14-Mar-26|RDSO Black|2000|46|92000
Pankaj ji (Stock)|049|14-Mar-26|RDSO Black|2000|46|92000
Pankaj ji (Stock)|050|16-Mar-26|RDSO Black|2000|46|92000
Pankaj ji (Stock)|051|17-Mar-26|RDSO Black|3000|48|144000
Pankaj ji (Stock)|052|18-Mar-26|RDSO Black|3360|48|161280
Pankaj ji (Stock)|052|18-Mar-26|RDSO Grey|1320|51|67320
Pankaj ji (Stock)|053|19-Mar-26|RDSO Grey|5000|51|255000
Pankaj ji (Stock)|054|20-Mar-26|RDSO Black|1600|48|76800
Pankaj ji (Stock)|054|20-Mar-26|RDSO Grey|2000|51|102000
Pankaj ji (Stock)|055|23-Mar-26|RDSO Grey|2085|51|106335
Pankaj ji (Stock)|056|24-Mar-26|RDSO Black|2000|48|96000
Pankaj ji (Stock)|057|25-Mar-26|RDSO Black|5008|49|245392
Pankaj ji (Stock)|058|26-Mar-26|RDSO Black|3040|49|148960
Pankaj ji (Stock)|059|27-Mar-26|RDSO Grey|4080|52|212160
Pankaj ji (Stock)|060|28-Mar-26|RDSO Grey|2770|52|144040
Pankaj ji (Stock)|061|30-Mar-26|RDSO Black|6986|49|342314
Pankaj ji (Stock)|062|31-Mar-26|RDSO Black|3014|49|147686
Pankaj ji (Stock)|063|1-Apr-26|RDSO Black|6016|49|294784
Pankaj ji (Stock)|064|2-Apr-26|RDSO Black|7000|49|343000
Pankaj ji (Stock)|065|7-Apr-26|RDSO Black|3000|49|147000
Pankaj ji (Stock)|065|7-Apr-26|RDSO Grey|6000|52|312000
Pankaj ji (Stock)|066|8-Apr-26|RDSO Grey|3000|52|156000
Pankaj ji (Stock)|067|10-Apr-26|RDSO Black|5000|49|245000
Pankaj ji (Stock)|068|11-Apr-26|RDSO Black|2000|49|98000
Pankaj ji (Stock)|069|13-Apr-26|RDSO Black|3000|49|147000
Pankaj ji (Stock)|070|14-Apr-26|RDSO Black|3000|49|147000
Pankaj ji (Stock)|071|15-Apr-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|072|16-Apr-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|073|17-Apr-26|RDSO Grey|4000|52|208000
Pankaj ji (Stock)|074|18-Apr-26|RDSO Grey|4000|52|208000
Pankaj ji (Stock)|075|20-Apr-26|RDSO Grey|3200|52|166400
Pankaj ji (Stock)|076|22-Apr-26|RDSO Black|4800|49|235200
Pankaj ji (Stock)|077|23-Apr-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|078|24-Apr-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|079|25-Apr-26|RDSO Grey|3800|52|197600
Pankaj ji (Stock)|080|27-Apr-26|RDSO Grey|4800|52|249600
Pankaj ji (Stock)|081|29-Apr-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|082|29-Apr-26|RDSO Black|4800|49|235200
Pankaj ji (Stock)|082|29-Apr-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|083|30-Apr-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|084|2-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|084|2-May-26|RDSO Grey|2400|52|124800
Pankaj ji (Stock)|085|2-May-26|RDSO Black|520|49|25480
Pankaj ji (Stock)|086|4-May-26|RDSO Grey|2600|52|135200
Pankaj ji (Stock)|087|4-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|088|5-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|089|6-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|090|7-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|091|9-May-26|RDSO Black|520|52|27040
Pankaj ji (Stock)|091|9-May-26|RDSO Grey|5600|52|291200
Pankaj ji (Stock)|092|11-May-26|RDSO Black|2200|49|107800
Pankaj ji (Stock)|093|12-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|094|13-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|095|14-May-26|RDSO Black|4000|49|196000
Pankaj ji (Stock)|096|15-May-26|RDSO Black|4000|49|196000
Pankaj ji (Stock)|097|16-May-26|RDSO Black|4800|49|235200
Pankaj ji (Stock)|097|16-May-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|098|18-May-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|099|20-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|099|20-May-26|RDSO Grey|2400|52|124800
Pankaj ji (Stock)|100|21-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|001|21-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|003|22-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|004|23-May-26|RDSO Black|804|49|39396
Pankaj ji (Stock)|005|23-May-26|RDSO Black|600|49|29400
Pankaj ji (Stock)|006|25-May-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|006|25-May-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|007|26-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|008|27-May-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|009|29-May-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|010|30-May-26|RDSO Black|800|49|39200
Pankaj ji (Stock)|010|30-May-26|RDSO Grey|2040|52|106080
Pankaj ji (Stock)|011|30-May-26|RDSO Grey|1640|52|85280
Pankaj ji (Stock)|012|30-May-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|013|1-Jun-26|RDSO Black|800|50|40000
Pankaj ji (Stock)|014|2-Jun-26|RDSO Grey|3200|53|169600
Pankaj ji (Stock)|015|3-Jun-26|RDSO Grey|5600|53|296800
Pankaj ji (Stock)|016|6-Jun-26|RDSO Grey|1000|53|53000
Pankaj ji (Stock)|017|10-Jun-26|RDSO Grey|1720|53|91160
Pankaj ji (Stock)|017|10-Jun-26|RDSO Black|4800|50|240000
Pankaj ji (Stock)|018|11-Jun-26|RDSO Grey|6400|53|339200
Pankaj ji (Stock)|019|13-Jun-26|RDSO Grey|3200|53|169600
Pankaj ji (Stock)|019|13-Jun-26|RDSO Black|3200|50|160000
Pankaj ji (Stock)|020|16-Jun-26|RDSO Black|3200|50|160000
Pankaj ji (Stock)|021|17-Jun-26|RDSO Black|2200|50|110000
Pankaj ji (Stock)|022|18-Jun-26|RDSO Black|1760|50|88000
Pankaj ji (Stock)|023|18-Jun-26|RDSO Black|800|50|40000
Pankaj ji (Stock)|024|19-Jun-26|RDSO Black|1600|50|80000
Pankaj ji (Stock)|025|19-Jun-26|RDSO Grey|3200|53|169600
Pankaj ji (Stock)|025|19-Jun-26|RDSO Black|800|50|40000
Pankaj ji (Stock)|026|20-Jun-26|RDSO Grey|3200|53|169600
Pankaj ji (Stock)|027|22-Jun-26|RDSO Black|7200|50|360000
Pankaj ji (Stock)|028|24-Jun-26|RDSO Black|800|50|40000
Pankaj ji (Stock)|029|24-Jun-26|RDSO Black|3200|50|160000
Pankaj ji (Stock)|030|25-Jun-26|RDSO Grey|1600|53|84800
Pankaj ji (Stock)|030|25-Jun-26|RDSO Black|8000|50|400000
Pankaj ji (Stock)|031|26-Jun-26|RDSO Grey|2400|53|127200
Pankaj ji (Stock)|032|28-Jun-26|RDSO Black|4000|50|200000
Pankaj ji (Stock)|032|28-Jun-26|RDSO Grey|800|53|42400
Pankaj ji (Stock)|033|29-Jun-26|RDSO Black|1600|50|80000
Pankaj ji (Stock)|034|29-Jun-26|RDSO Black|800|50|40000
Pankaj ji (Stock)|035|29-Jun-26|RDSO Black|1600|50|80000
Pankaj ji (Stock)|036|30-Jun-26|RDSO Black|3200|50|160000
Pankaj ji (Stock)|036|30-Jun-26|RDSO Grey|1600|53|84800
Pankaj ji (Stock)|037|30-Jun-26|RDSO Black|2400|50|120000
Pankaj ji (Stock)|038|30-Jun-26|RDSO Black|2400|50|120000
Pankaj ji (Stock)|038|30-Jun-26|RDSO Grey|1600|53|84800
Pankaj ji (Stock)|039|1-Jul-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|039|1-Jul-26|RDSO Black|800|49|39200
Pankaj ji (Stock)|040|2-Jul-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|041|2-Jul-26|RDSO Black|3960|49|194040
Pankaj ji (Stock)|041|2-Jul-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|042|3-Jul-26|RDSO Black|4000|49|196000
Pankaj ji (Stock)|043|4-Jul-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|044|6-Jul-26|RDSO Black|760|49|37240
Pankaj ji (Stock)|044|6-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|045|7-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|046|7-Jul-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|047|8-Jul-26|RDSO Grey|1520|52|79040
Pankaj ji (Stock)|048|8-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|049|9-Jul-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|049|9-Jul-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|050|10-Jul-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|050|10-Jul-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|051|11-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|052|11-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|052|11-Jul-26|RDSO Grey|800|52|41600
Pankaj ji (Stock)|052|11-Jul-26|RDSO Black|800|49|39200
Pankaj ji (Stock)|053|12-Jul-26|RDSO Black|800|49|39200
Pankaj ji (Stock)|053|12-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|054|12-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|055|13-Jul-26|RDSO Grey|3200|52|166400
Pankaj ji (Stock)|056|13-Jul-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|057|14-Jul-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|058|15-Jul-26|RDSO Black|6400|49|313600
Pankaj ji (Stock)|059|16-Jul-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|060|16-Jul-26|RDSO Grey|3200|52|166400
Pankaj ji (Stock)|061|17-Jul-26|RDSO Grey|5600|52|291200
Pankaj ji (Stock)|062|20-Jul-26|RDSO Grey|6800|52|353600
Pankaj ji (Stock)|062|20-Jul-26|RDSO Black|4040|49|197960
Pankaj ji (Stock)|063|21-Jul-26|RDSO Black|6400|49|313600
Pankaj ji (Stock)|064|22-Jul-26|RDSO Black|5600|49|274400
Pankaj ji (Stock)|065|23-Jul-26|RDSO Black|4800|49|235200
Pankaj ji (Stock)|066|24-Jul-26|RDSO Grey|6400|52|332800
Pankaj ji (Stock)|066|24-Jul-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|067|27-Jul-26|RDSO Black|800|49|39200
Pankaj ji (Stock)|068|28-Jul-26|RDSO Black|1560|49|76440
Pankaj ji (Stock)|069|31-Jul-26|RDSO Grey|3200|52|166400
Pankaj ji (Stock)|070|1-Aug-26|RDSO Grey|6480|52|336960
Pankaj ji (Stock)|071|4-Aug-26|RDSO Grey|5720|52|297440
Pankaj ji (Stock)|071|4-Aug-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|072|5-Aug-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|073|6-Aug-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|074|6-Aug-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|075|7-Aug-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|076|8-Aug-26|RDSO Black|5600|49|274400
Pankaj ji (Stock)|077|10-Aug-26|RDSO Black|5600|49|274400
Pankaj ji (Stock)|078|11-Aug-26|RDSO Grey|1600|52|83200
Pankaj ji (Stock)|079|11-Aug-26|RDSO Grey|4000|52|208000
Pankaj ji (Stock)|080|12-Aug-26|RDSO Black|1600|49|78400
Pankaj ji (Stock)|081|13-Aug-26|RDSO Black|3200|49|156800
Pankaj ji (Stock)|082|13-Aug-26|RDSO Black|2400|49|117600
Pankaj ji (Stock)|083|14-Aug-26|RDSO Black|800|49|39200
`.trim();

function parseBillDate(text: string): Date {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/.exec(text.trim());
  if (!match) throw new Error(`Invalid bill date: ${text}`);
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const year = 2000 + Number(match[3]);
  if (!month) throw new Error(`Invalid month: ${text}`);
  return new Date(Date.UTC(year, month - 1, day));
}

type ParsedRow = {
  notes: string;
  billNumber: string;
  date: Date;
  itemDescription: string;
  quantity: number;
  rate: number;
  salesValue: number;
};

function parseRows(): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const [index, line] of RAW_ROWS.split("\n").entries()) {
    const parts = line.trim().split("|");
    if (parts.length !== 7) {
      throw new Error(`Row ${index + 1} has ${parts.length} columns: ${line}`);
    }
    const [notes, billNumber, dateText, itemDescription, qtyText, rateText, valueText] =
      parts;
    const quantity = Number(qtyText);
    const rate = Number(rateText);
    const salesValue = Number(valueText);
    if (![quantity, rate, salesValue].every(Number.isFinite)) {
      throw new Error(`Row ${index + 1} has non-numeric amounts: ${line}`);
    }
    const computed = Math.round(quantity * rate * 100) / 100;
    if (Math.abs(computed - salesValue) > 0.01) {
      throw new Error(
        `Row ${index + 1} qty*rate mismatch: ${quantity}*${rate}=${computed} vs ${salesValue}`,
      );
    }
    rows.push({
      notes,
      billNumber,
      date: parseBillDate(dateText),
      itemDescription,
      quantity,
      rate,
      salesValue,
    });
  }
  return rows;
}

async function main() {
  const rows = parseRows();
  const qtyTotal = rows.reduce((sum, r) => sum + r.quantity, 0);
  const valueTotal = rows.reduce((sum, r) => sum + r.salesValue, 0);

  if (Math.abs(qtyTotal - EXPECTED_QTY) > 0.001) {
    throw new Error(`Qty total mismatch: parsed ${qtyTotal}, expected ${EXPECTED_QTY}`);
  }
  if (Math.abs(valueTotal - EXPECTED_VALUE) > 0.001) {
    throw new Error(
      `Goods value mismatch: parsed ${valueTotal}, expected ${EXPECTED_VALUE}`,
    );
  }

  const plant = await prisma.plant.findUnique({
    where: { code: "PVC" },
    select: { id: true, name: true },
  });
  if (!plant) throw new Error("PVC plant does not exist");

  const actor = await prisma.user.findFirst({
    where: { globalRole: "SUPER_ADMIN", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!actor) throw new Error("Active Super Admin does not exist");

  const createdAtBase = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
  const sales: Prisma.SaleCreateManyInput[] = rows.map((row, index) => ({
    sourceKey: `${SOURCE_PREFIX}${String(index + 1).padStart(3, "0")}:${row.billNumber}:${row.itemDescription}`,
    plantId: plant.id,
    date: row.date,
    shift: ManpowerShift.DAY,
    type: SaleType.FINISHED_GOOD,
    typeOther: null,
    customerName: CUSTOMER_NAME,
    billNumber: row.billNumber,
    billDate: row.date,
    itemDescription: row.itemDescription,
    unit: "KGS",
    quantity: row.quantity,
    rate: row.rate,
    salesValue: row.salesValue,
    notes: row.notes,
    enteredById: actor.id,
    isBackdated: true,
    createdAt: new Date(createdAtBase + index * 1000),
  }));

  const deleted = await prisma.$transaction(async (tx) => {
    const removed = await tx.sale.deleteMany({ where: { plantId: plant.id } });
    await tx.sale.createMany({ data: sales });
    return removed.count;
  });

  const check = await prisma.sale.aggregate({
    where: { plantId: plant.id },
    _count: true,
    _sum: { quantity: true, salesValue: true },
  });

  const dbQty = Number(check._sum.quantity);
  const dbValue = Number(check._sum.salesValue);
  if (check._count !== rows.length) {
    throw new Error(`DB row count ${check._count} != ${rows.length}`);
  }
  if (Math.abs(dbQty - EXPECTED_QTY) > 0.001) {
    throw new Error(`DB qty ${dbQty} != ${EXPECTED_QTY}`);
  }
  if (Math.abs(dbValue - EXPECTED_VALUE) > 0.001) {
    throw new Error(`DB value ${dbValue} != ${EXPECTED_VALUE}`);
  }

  console.log(`PVC sales replaced in ${plant.name} as ${actor.email}`);
  console.log(`  Deleted old sales: ${deleted}`);
  console.log(`  Inserted rows: ${check._count}`);
  console.log(`  Qty total: ${dbQty.toLocaleString("en-IN")}`);
  console.log(`  Goods value: ${dbValue.toLocaleString("en-IN")}`);
}

main()
  .catch((error) => {
    console.error("PVC sales seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
