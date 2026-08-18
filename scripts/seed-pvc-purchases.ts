import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env"), override: true });

import { ManpowerShift, Prisma, PurchaseType } from "@prisma/client";
import { prisma } from "../src/lib/db";

const SOURCE_PREFIX = "seed:pvc-purchase-jul26:";

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

/** vendor|item|bill|date|unit|qty|rate|basic|gst|invoice|remarks — blank rows omitted */
const RAW_ROWS = `
S.S Industries|Calcium Zinc Stabilizer (CZ-35)|SSI/2526/078|23-Jan-26|KGS|7000|18|126000|22680|148680|
S.S Industries|Calcium Powder|1383|23-Jan-26|KGS|3000|7.75|23250|4185|27435|
S.S Industries|Calcium Zinc Stabilizer (CZ-35)|ATCL/DN/2526/042|28-Jan-26|KGS||1|-7000|-1260|-8260|
Mahalaxmi Enterprises|Black Carbon|ME/25-26/1508|24-Jan-26|KGS|500|110|55000|9900|64900|
Mahalaxmi Enterprises|Titanium Dioxide|ME/25-26/1508|24-Jan-26|KGS|50|222|11100|1998|13098|
Mahalaxmi Enterprises|Pigment Colour-RED|ME/25-26/1508|24-Jan-26|KGS|5|440|2200|396|2596|
Mahalaxmi Enterprises|Pigment Colour-BLUE|ME/25-26/1508|24-Jan-26|KGS|5|565|2825|509|3334|
Techno Polychem|Chlorinated Paraffin|ALI/4050/2025-26|24-Jan-26|KGS|5000|54|270000|48600|318600|
Techno Polychem|Stearic Acid|ALI/4050/2025-26|24-Jan-26|KGS|100|115|11500|2070|13570|
Radhe Radhe Plastic|Green Pipe|339|25-Jan-26|KGS|3375|36.83|124301|22374|146675|
Radhe Radhe Plastic|Pani Pipe|339|25-Jan-26|KGS|6190|36.83|227978|41036|269014|
Radhe Radhe Plastic|Soft Pvc|339|25-Jan-26|KGS|775|41.84|32422|5836|38258|
Radhe Radhe Plastic|Green Pipe|ATCL/DN/2526/041|25-Jan-26|KGS|-25|36.83|-921|-166|-1086|
Radhe Radhe Plastic|Pani Pipe|ATCL/DN/2526/041|25-Jan-26|KGS|-32|36.83|-1179|-212|-1391|
Radhe Radhe Plastic|Soft Pvc|ATCL/DN/2526/041|25-Jan-26|KGS|-23|41.84|-962|-173|-1135|
National Traders|Pani Pipe|NT/56|26-Jan-26|KGS|12710|34|432140|77785|509925|
Arihant Wire Industries|Wire Mesh (Roll)|4692|27-Jan-26|Roll|8|9250|74000|13320|87320|
Radhe Radhe Plastic|Soft Pvc|353|4-Feb-26|KGS|4805|39.82|191335|34440|225775|
Radhe Radhe Plastic|Pani Pipe|353|4-Feb-26|KGS|8780|34.82|305720|55030|360749|
Radhe Radhe Plastic|Soft Pvc|ATCL/DN/2526/043|5-Feb-26|KGS|-20|39.82|-796|-143|-940|
Radhe Radhe Plastic|Pani Pipe|ATCL/DN/2526/043|5-Feb-26|KGS|-45|34.82|-1567|-282|-1849|
Radhe Radhe Plastic|Soft Pvc|ATCL/DN/2526/044|5-Feb-26|KGS||0.30|-4056|-730|-4786|
D. K. Traders|Old Plastic west Scrap (PVC Pipe)|526|13-Feb-26|KGS|13035|34|443190|79774|522964|
Rafia Enterprises|H. Cilies (Waste PVC Scrap)|65|14-Feb-26|KGS|870|35|30450|5481|35931|
S.K. Scrap Traders|Pani Pipe|288|18-Feb-26|KGS|11130|34|378420|68116|446536|
Radhe Radhe Plastic|Green Pipe|378|20-Feb-26|KGS|10386|34.50|358317|64497|422814|
Radhe Radhe Plastic|JHAL Plastic Scrap|384|24-Feb-26|KGS|735|31|22785|4101|26886|
Radhe Radhe Plastic|Soft Clear Pvc|384|24-Feb-26|KGS|2720|39.41|107195|19295|126490|
Radhe Radhe Plastic|Green Pipe|384|24-Feb-26|KGS|6775|34.50|233738|42073|275810|
S.K. Scrap Traders|Pani Pipe|298|27-Feb-26|KGS|13235|34|449990|80998|530988|
Radhe Radhe Plastic|Pani Pipe|387|27-Feb-26|KGS|9000|34|306000|55080|361080|
Radhe Radhe Plastic|Soft Clear Pvc|387|27-Feb-26|KGS|1545|39.41|60888|10960|71848|
Radhe Radhe Plastic|Soft Clear Pvc|Debit Note|28-Feb-26|KGS|-45|39.41|-1773|-319|-2093|
Mahalaxmi Enterprises|Pigment Colour-BLACK|ME/25-26/1618|6-Mar-26|KGS|500|110|55000|9900|64900|
Mahalaxmi Enterprises|Titanium Dioxide|ME/25-26/1618|6-Mar-26|KGS|125|288|36000|6480|42480|
UK Traders|H. Cilies (Waste PVC Scrap)|18|9-Mar-26|KGS|2000|33.70|67400|12132|79532|
UK Traders|H. Cilies (Waste PVC Scrap)|ATCL/DN/2526/054|10-Mar-26|KGS|-275|33.70|-9268|-1668|-10936|
Radhe Radhe Plastic|Pani Pipe|422|13-Mar-26|KGS|5170|36|186120|33502|219622|
Radhe Radhe Plastic|Soft Clear Pvc|422|13-Mar-26|KGS|4895|40.91|200254|36046|236300|
Radhe Radhe Plastic|PVC SCRAP (Avg. Rate-S. Cliar & Pani Pipe)|ATCL/DN/2526/057|16-Mar-26|KGS|-50|38.45|-1923|-346|-2269|
S.S Industries|Calcium Zinc Stabilizer (CZ-35)|SSI/2526/091|16-Mar-26|KGS|10000|18.60|186000|33480|219480|
Hayat Relife Metal|Pani Pipe|4|16-Mar-26|KGS|20285|35.75|725189|130534|855723|
Hayat Relife Metal|Green Pipe|4|16-Mar-26|KGS|3200|35.75|114400|20592|134992|
S.K. Scrap Traders|Pani Pipe|322|24-Mar-26|KGS|12085|36|435060|78311|513371|
S.K. Scrap Traders|Pani Pipe|ATCL/DN/2526/059|27-Mar-26|KGS|-20|33.70|-674|-121|-795|
MADAN CHEMICALS PRIVATE LIMITED|CPW|M2315/25-26|25-Mar-26|KGS|6000|78|468000|84240|552240|
Radhe Radhe Plastic|Green Pipe|438|27-Mar-26|KGS|10575|36.60|387045|69668|456713|
Radhe Radhe Plastic|Soft Clear Pvc|438|27-Mar-26|KGS|1695|40.91|69342|12482|81824|
R K Enterprises|Soft Clear Pvc|296|27-Mar-26|KGS|3740|41|153340|27601|180941|
R K Enterprises|JHAL Plastic Scrap|296|27-Mar-26|KGS|3835|38|145730|26231|171961|
Mahalaxmi Enterprises|Pigment Colour-RED|ME/25-26/1677|28-Mar-26|KGS|10|550|5500|990|6490|
Mahalaxmi Enterprises|Pigment Colour-Blue|ME/25-26/1677|28-Mar-26|KGS|10|750|7500|1350|8850|
Hayat Relife Metal|Pani Pipe|1|1-Apr-26|KGS|12430|35.75|444373|79987|524360|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/002|3-Apr-26|KGS|-100|35.75|-3575|-644|-4219|
S K SCRAP TRADERS|Pani Pipe|08|3-Apr-26|KGS|9150|36|329400|59292|388692|
S K SCRAP TRADERS|Pani Pipe|ATCL/DN/2627/008|14-Apr-26|KGS|-25|36|-900|-162|-1062|
R K ENTERPRISES|S. CLEAR|297|10-Apr-26|KGS|2475|41|101475|18266|119741|
R K ENTERPRISES|JHAAL|297|10-Apr-26|KGS|2145|38|81510|14672|96182|
R K ENTERPRISES|H. CLEAR|297|10-Apr-26|KGS|4310|35|150850|27153|178003|
Hayat Relife Metal|Pani Pipe|9|11-Apr-26|KGS|18670|35.50|662785|119301|782086|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/006|14-Apr-26|KGS|-90|35.50|-3195|-575|-3770|
R K ENTERPRISES|JHAAL|ATCL/DN/2627/007|14-Apr-26|KGS|-40|38|-1520|-274|-1794|
Mahalaxmi Enterprises|TITANIUM DIOXIDE|ME/26-27/35|14-Apr-26|KGS|150|332|49800|8964|58764|
S K SCRAP TRADERS|Pani Pipe|23|14-Apr-26|KGS|10140|36|365040|65707|430747|
Radhe Radhe Plastic|GREEN PIPE|20|16-Apr-26|KGS|12180|36|438480|78926|517406|
Radhe Radhe Plastic|GREEN PIPE|ATCL/DN/2627/009|18-Apr-26|KGS|-40|36|-1440|-259|-1699|
S K SCRAP TRADERS|Pani Pipe|ATCL/DN/2627/012|22-Apr-26|KGS|-35|36|-1260|-227|-1487|
Mahalaxmi Enterprises|TITANIUM DIOXIDE|ME/26-27/63|27-Apr-26|KGS|150|328|49200|8856|58056|
Mahalaxmi Enterprises|GRINDING WHEEL|ME/26-27/63|27-Apr-26|KGS|13.48|55.08|742|134|876|
Mahalaxmi Enterprises|Pigment Colour-Blue|ME/26-27/65|28-Apr-26|KGS|20|780|15600|2808|18408|
Radhe Radhe Plastic|S. CLEAR|34|8-May-26|KGS|1544|39.50|60988|10978|71966|
Radhe Radhe Plastic|GREEN PIPE|34|8-May-26|KGS|11116|34|377944|68030|445974|
Radhe Radhe Plastic|Soft Pvc & Pani Pipe|ATCL/DN/2627/015|12-May-26|KGS|120|36.75|4410|794|5204|
Hayat Relife Metal|Pani Pipe|29|13-May-26|KGS|12380|33.50|414730|74651|489381|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/016|14-May-26|KGS|-40|33.50|-1340|-241|-1581|
HAMJA TRADERS|H. CLEAR|08|12-May-26|KGS|980|30|29400|5292|34692|
HAMJA TRADERS|H. CLEAR|10|13-May-26|KGS|870|30|26100|4698|30798|
HAMJA TRADERS|H. CLEAR|14|16-May-26|KGS|410|30|12300|2214|14514|
HAMJA TRADERS|H. CLEAR|ATCL/DN/2627/023|20-May-26|KGS|-20|30|-600|-108|-708|
HAMJA TRADERS|H. CLEAR|15|18-May-26|KGS|270|30|8100|1458|9558|
HAMJA TRADERS|H. CLEAR|ATCL/DN/2627/019|18-May-26|KGS|-35|30|-1050|-189|-1239|
R K ENTERPRISES|S. CLEAR|299|17-May-26|KGS|1340|40|53600|9648|63248|
R K ENTERPRISES|H. CLEAR|299|17-May-26|KGS|3490|33|115170|20731|135901|
R K ENTERPRISES|JHAAL|299|17-May-26|KGS|2475|37|91575|16484|108059|
R K ENTERPRISES|BARDANA|ATCL/DN/2627/021|19-May-26|KGS|-50|36.66|-1833|-330|-2163|
Radhe Radhe Plastic|GREEN PIPE|38|18-May-26|KGS|8116|34|275944|49670|325614|
Radhe Radhe Plastic|S. CLEAR|38|18-May-26|KGS|1854|39.50|73233|13182|86415|
Radhe Radhe Plastic|GREEN PIPE & S. CLEAR|ATCL/DN/2627/020|19-May-26|KGS|-82|36.75|-3014|-542|-3556|
Hayat Relife Metal|Pani Pipe|35|25-May-26|KGS|21170|33.50|709195|127655|836850|
SUNTEK CHLORIDES Pvt Ltd.|Chlorinated Paraffin|1283/26-27|28-May-26|KGS|6250|70|437500|78750|516250|
S.S Industries|Calcium Zinc Stabilizer (CZ-35)|SSI/2627/17|5-Jun-26|KGS|7000|18.60|130200|23436|153636|
Radhe Radhe Plastic|S. CLEAR|51|8-Jun-26|KGS|5395|39.50|213103|38358|251461|
Radhe Radhe Plastic|GREEN PIPE|51|8-Jun-26|KGS|9635|34|327590|58966|386556|
Radhe Radhe Plastic|GREEN PIPE|ATCL/DN/2627/024|10-Jun-26|KGS|-57.50|34|-1955|-352|-2307|
Radhe Radhe Plastic|S. CLEAR|ATCL/DN/2627/024|10-Jun-26|KGS|-57.50|39.50|-2271|-409|-2680|
R K ENTERPRISES|S. CLEAR Granding|301|10-Jun-26|KGS|2075|33|68475|12326|80801|
R K ENTERPRISES|JHAAL (Ghas Granding)|301|10-Jun-26|KGS|1130|32|36160|6509|42669|
R K ENTERPRISES|H. CLEAR|301|10-Jun-26|KGS|485|24|11640|2095|13735|
R K ENTERPRISES|S. CLEAR|301|10-Jun-26|KGS|1610|40|64400|11592|75992|
R K ENTERPRISES|JHAAL|301|10-Jun-26|KGS|3150|37|116550|20979|137529|
Hayat Relife Metal|Pani Pipe|38|15-Jun-26|KGS|10800|34|367200|66096|433296|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/027|17-Jun-26|KGS|-180.70|34|-6144|-1106|-7250|
Mahalaxmi Enterprises|Pigment Colour (Carbon)|ME/26-27/185|11-Jun-26|KGS|500|120|60000|10800|70800|
Mahalaxmi Enterprises|TITANIUM DIOXIDE|ME/26-27/185|11-Jun-26|KGS|100|275|27500|4950|32450|
Mahalaxmi Enterprises|Stearic Acid (Wax/Mom)|ME/26-27/185|11-Jun-26|KGS|100|138|13800|2484|16284|
Mahalaxmi Enterprises|Pigment Colour-RED|ME/26-27/185|11-Jun-26|KGS|10|540|5400|972|6372|
Arihant Wire Industries|Wire Mesh (Roll)|4936|23-Jun-26|KGS|150|180|27000|4860|31860|
Radhe Radhe Plastic|GREEN PIPE|60|25-Jun-26|KGS|10145|34.50|350003|63000|413003|
Radhe Radhe Plastic|Pani Pipe|60|25-Jun-26|KGS|3535|35.75|126376|22748|149124|
HAMJA TRADERS|H. CLEAR|32|26-Jun-26|KGS|740|30|22200|3996|26196|
A K ENTERPRISES , KANPUR|Pani Pipe|34|27-Jun-26|KGS|12245|35|428575|77144|505719|
Radhe Radhe Plastic|BARDANA (Empty Bag)|ATCL/DN/2627/035|30-Jun-26|KGS|-35|35.13|-1230|-221|-1451|
A K ENTERPRISES , KANPUR|BARDANA (Empty Bag)|ATCL/DN/2627/034|30-Jun-26|KGS|-30|35|-1050|-189|-1239|
R K ENTERPRISES|H. CLEAR|305|3-Jul-26|KGS|405|33|13365|2406|15771|
R K ENTERPRISES|Ghash Granding|305|3-Jul-26|KGS|2415|32|77280|13910|91190|
R K ENTERPRISES|S. CLEAR|305|3-Jul-26|KGS|1760|40|70400|12672|83072|
R K ENTERPRISES|JHAAL|305|3-Jul-26|KGS|3530|37|130610|23510|154120|
Hayat Relife Metal|Pani Pipe|40|5-Jul-26|KGS|18085|35|632975|113936|746911|
R K ENTERPRISES|H. CLEAR/GRANDING/S. CLEAR/JHAAL|ATCL/DN/2627/038|6-Jul-26|KGS|-30|35.35|-1061|-191|-1251|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/039|7-Jul-26|KGS|-85|35|-2975|-536|-3511|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/039|7-Jul-26|KGS|||-3600|-648|-4248|Price deduction (12000kg @0.30)
S.K. SCRAP TRADERS|Pani Pipe|103|6-Jul-26|KGS|12135|35.50|430793|77543|508335|
Mahalaxmi Enterprises|TITANIUM DIOXIDE|ME/26-27/258|7-Jul-26|KGS|200|280|56000|10080|66080|
Radhe Radhe Plastic|GREEN PIPE|68|12-Jul-26|KGS|10965|35.48|389038|70027|459065|
Radhe Radhe Plastic|GREEN PIPE|ATCL/DN/2627/043|13-Jul-26|KGS|-35|35.48|-1242|-224|-1465|
Radhe Radhe Plastic|S. CLEAR|71|14-Jul-26|KGS|2720|39.50|107440|19339|126779|
Radhe Radhe Plastic|GREEN PIPE|71|14-Jul-26|KGS|7755|35.48|275147|49527|324674|
S.S Industries|Calcium Zinc Stabilizer (CZ-35)|SSI/2627/33|15-Jul-26|KGS|10000|18.60|186000|33480|219480|
Mahalaxmi Enterprises|Calcium Powder|ME/26-27/282|15-Jul-26|KGS|1000|9|9000|1620|10620|
Mahalaxmi Enterprises|Pigment Colour-RED|ME/26-27/282|15-Jul-26|KGS|20|550|11000|1980|12980|
Mahalaxmi Enterprises|Pigment Colour-BLUE|ME/26-27/282|15-Jul-26|KGS|20|860|17200|3096|20296|
Radhe Radhe Plastic|S. CLEAR / GREEN PIPE|ATCL/DN/2627/046|18-Jul-26|KGS|-135|37.49|-5061|-911|-5972|
SUNTEK PLASTICIZER PRIVATE LIMITED|Chlorinated Paraffin|SPK/173/26-27|18-Jul-26|KGS|11750|60|705000|126900|831900|
HAMJA TRADERS|HARD CLEAR|39|18-Jul-26|KGS|1050|30|31500|5670|37170|
Mahalaxmi Enterprises|Titanium Dioxide|ME/26-27/289|18-Jul-26|KGS|250|285|71250|12825|84075|
Hayat Relife Metal|Pani Pipe|45|19-Jul-26|KGS|12490|36|449640|80935|530575|
ROYAL INDUSTRIES|HARD CLEAR|20|20-Jul-26|KGS|1060|30|31800|5724|37524|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/048|21-Jul-26|KGS|-120|36|-4320|-778|-5098|
R K ENTERPRISES|HARD CLEAR|306|22-Jul-26|KGS|1505|33|49665|8940|58605|
R K ENTERPRISES|JHAAL|306|22-Jul-26|KGS|2645|37|97865|17616|115481|
R K ENTERPRISES|S. CLEAR|306|22-Jul-26|KGS|3960|40|158400|28512|186912|
Hayat Relife Metal|Pani Pipe|47|23-Jul-26|KGS|12330|34|419220|75460|494680|
Hayat Relife Metal|Pani Pipe|48|24-Jul-26|KGS|12645|37|467865|84216|552081|
Hayat Relife Metal|Pani Pipe|ATCL/DN/2627/049|24-Jul-26|KGS|-100|34|-3400|-612|-4012|
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

function parseAmount(text: string, label: string, line: string): number {
  const trimmed = text.replace(/,/g, "").trim();
  if (!trimmed || trimmed === "-") return 0;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${label} on ${line}`);
  }
  return value;
}

type ParsedRow = {
  vendorName: string;
  itemDescription: string;
  billNumber: string;
  date: Date;
  unit: string;
  quantity: number;
  rate: number;
  basicValue: number;
  gstAmount: number;
  invoiceValue: number;
  notes: string | null;
};

function parseRows(): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const [index, line] of RAW_ROWS.split("\n").entries()) {
    const parts = line.split("|");
    if (parts.length !== 11) {
      throw new Error(`Row ${index + 1} has ${parts.length} columns: ${line}`);
    }
    const [
      vendorName,
      itemDescription,
      billNumber,
      dateText,
      unit,
      qtyText,
      rateText,
      basicText,
      gstText,
      invoiceText,
      remarksText,
    ] = parts;
    const basicValue = parseAmount(basicText, "basic", line);
    const gstAmount = parseAmount(gstText, "gst", line);
    const invoiceValue = parseAmount(invoiceText, "invoice", line);
    if (Math.abs(basicValue + gstAmount - invoiceValue) > 1.01) {
      throw new Error(
        `Row ${index + 1} invoice mismatch: ${basicValue}+${gstAmount} vs ${invoiceValue}`,
      );
    }
    rows.push({
      vendorName: vendorName.trim(),
      itemDescription: itemDescription.trim(),
      billNumber: billNumber.trim(),
      date: parseBillDate(dateText),
      unit: unit.trim() || "KGS",
      quantity: parseAmount(qtyText, "qty", line),
      rate: parseAmount(rateText, "rate", line),
      basicValue,
      gstAmount,
      invoiceValue,
      notes: remarksText.trim() || null,
    });
  }
  return rows;
}

async function main() {
  const rows = parseRows();
  const basicTotal = rows.reduce((sum, r) => sum + r.basicValue, 0);
  const gstTotal = rows.reduce((sum, r) => sum + r.gstAmount, 0);
  const invoiceTotal = rows.reduce((sum, r) => sum + r.invoiceValue, 0);

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

  const createdAtBase = Date.UTC(2026, 0, 1, 12, 0, 0, 0);
  const purchases: Prisma.PurchaseCreateManyInput[] = rows.map((row, index) => ({
    sourceKey: `${SOURCE_PREFIX}${String(index + 1).padStart(3, "0")}:${row.billNumber}:${row.itemDescription}`,
    plantId: plant.id,
    date: row.date,
    shift: ManpowerShift.DAY,
    type: PurchaseType.RAW_MATERIAL,
    typeOther: null,
    vendorName: row.vendorName,
    billNumber: row.billNumber,
    billDate: row.date,
    itemDescription: row.itemDescription,
    unit: row.unit,
    quantity: row.quantity,
    rate: row.rate,
    basicValue: row.basicValue,
    gstPercent: 18,
    gstAmount: row.gstAmount,
    invoiceValue: row.invoiceValue,
    notes: row.notes,
    enteredById: actor.id,
    isBackdated: true,
    createdAt: new Date(createdAtBase + index * 1000),
  }));

  const deleted = await prisma.$transaction(async (tx) => {
    const removed = await tx.purchase.deleteMany({ where: { plantId: plant.id } });
    await tx.purchase.createMany({ data: purchases });
    return removed.count;
  });

  const check = await prisma.purchase.aggregate({
    where: { plantId: plant.id },
    _count: true,
    _sum: { basicValue: true, gstAmount: true, invoiceValue: true },
  });

  const dbBasic = Number(check._sum.basicValue);
  const dbGst = Number(check._sum.gstAmount);
  const dbInvoice = Number(check._sum.invoiceValue);
  if (check._count !== rows.length) {
    throw new Error(`DB row count ${check._count} != ${rows.length}`);
  }
  if (Math.abs(dbBasic - basicTotal) > 0.01) {
    throw new Error(`DB basic ${dbBasic} != ${basicTotal}`);
  }
  if (Math.abs(dbGst - gstTotal) > 0.01) {
    throw new Error(`DB gst ${dbGst} != ${gstTotal}`);
  }
  if (Math.abs(dbInvoice - invoiceTotal) > 0.01) {
    throw new Error(`DB invoice ${dbInvoice} != ${invoiceTotal}`);
  }

  console.log(`PVC purchases replaced in ${plant.name} as ${actor.email}`);
  console.log(`  Deleted old purchases: ${deleted}`);
  console.log(`  Inserted rows: ${check._count}`);
  console.log(`  Basic value: ${dbBasic.toLocaleString("en-IN")}`);
  console.log(`  GST @ 18%: ${dbGst.toLocaleString("en-IN")}`);
  console.log(`  Invoice value: ${dbInvoice.toLocaleString("en-IN")}`);
}

main()
  .catch((error) => {
    console.error("PVC purchase seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
