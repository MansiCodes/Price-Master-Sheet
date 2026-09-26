import { ManpowerShift, SaleType } from "@prisma/client";
import { parseDateOnly } from "@/lib/dates";
import { normalizeBillPhotoUrls } from "@/lib/cloudinary";

export function saleCreateData(opts: {
  writePlantId: string;
  day: Date;
  shift: ManpowerShift;
  type: SaleType;
  typeOther?: string | null;
  customerName: string;
  billNumber?: string | null;
  billDate?: string | null;
  notes?: string | null;
  itemDescription: string;
  unit: string;
  quantity: number;
  rate: number;
  salesValue: number;
  inMeter?: number | null;
  qtyMtr?: number | null;
  meterUnit?: string | null;
  photos: ReturnType<typeof normalizeBillPhotoUrls>;
  enteredById: string;
  backdated: boolean;
  approvalFields: Record<string, unknown>;
}) {
  return {
    plantId: opts.writePlantId,
    date: opts.day,
    shift: opts.shift,
    type: opts.type,
    typeOther:
      opts.type === SaleType.OTHERS
        ? opts.typeOther?.trim() || null
        : null,
    customerName: opts.customerName,
    billNumber: opts.billNumber ?? null,
    billDate: opts.billDate ? parseDateOnly(opts.billDate) : null,
    notes: opts.notes?.trim() || null,
    itemDescription: opts.itemDescription,
    unit: opts.unit,
    quantity: opts.quantity,
    rate: opts.rate,
    salesValue: opts.salesValue,
    inMeter: opts.inMeter ?? null,
    qtyMtr: opts.qtyMtr ?? null,
    meterUnit: opts.meterUnit?.trim() || null,
    billPhotoUrl: opts.photos.billPhotoUrl,
    billPhotoUrls: opts.photos.billPhotoUrls,
    enteredById: opts.enteredById,
    isBackdated: opts.backdated,
    ...opts.approvalFields,
  };
}
