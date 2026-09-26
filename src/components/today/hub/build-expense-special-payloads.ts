import { PVC_FAR_DEP_PERCENT, PVC_UNLOADING_RATE_PER_MT } from "@/lib/plant-catalogs";
import type {
  SubmitExpenseElectricityArgs,
  SubmitExpenseFactoryRentArgs,
  SubmitExpenseFarArgs,
  SubmitExpenseUnloadingArgs,
} from "@/components/today/hub/submit-args";

export function factoryRentValues(args: SubmitExpenseFactoryRentArgs) {
  const area = args.rentCoveredArea === "" ? null : Number(args.rentCoveredArea);
  const rate = Number(args.rentRatePerSqft) || 12;
  const rentAmount = area != null && Number.isFinite(area) ? area * rate : Number(args.expenseAmount);
  return { area, rate, rentAmount };
}

export function factoryRentBody(args: SubmitExpenseFactoryRentArgs, area: number | null, rate: number, rentAmount: number) {
  return {
    month: args.expenseMonth || args.entryDate.slice(0, 7),
    coveredAreaSqft: area,
    rentRatePerSqft: rate,
    rentAmount,
    notes: args.expenseDesc.trim() || null,
    dailyDate: args.entryDate,
    shift: args.shift,
    expenseHead: "Factory Rent",
    payMode: args.expensePayMode,
  };
}

export function electricityValues(args: SubmitExpenseElectricityArgs) {
  const opening = args.expenseOpeningReading === "" ? null : Number(args.expenseOpeningReading);
  const closing = args.expenseClosingReading === "" ? null : Number(args.expenseClosingReading);
  const rate = Number(args.expenseRate) || 0;
  const consumed =
    opening != null && closing != null && Number.isFinite(opening) && Number.isFinite(closing)
      ? Math.max(0, closing - opening)
      : null;
  const billAmount =
    consumed != null && rate > 0 ? Math.round(consumed * rate * 100) / 100 : Number(args.expenseAmount) || 0;
  return { opening, closing, rate, consumed, billAmount };
}

export function electricityBody(
  args: SubmitExpenseElectricityArgs,
  values: ReturnType<typeof electricityValues>,
) {
  return {
    month: args.expenseMonth || args.entryDate.slice(0, 7),
    openingReading: values.opening,
    closingReading: values.closing,
    consumedUnits: values.consumed,
    billAmount: values.billAmount,
    notes: args.expenseDesc.trim() || null,
    dailyDate: args.entryDate,
    shift: args.shift,
    expenseHead: args.expenseHead,
    payMode: args.expensePayMode,
  };
}

export function farValues(args: SubmitExpenseFarArgs) {
  const cost = Number(args.farCost);
  const gst = args.farGst === "" ? Math.round(cost * 0.18 * 100) / 100 : Number(args.farGst);
  const vendor = args.farVendor === "Other" ? args.farVendorOther.trim() : args.farVendor.trim();
  return { cost, gst, vendor };
}

export function farBody(args: SubmitExpenseFarArgs, cost: number, gst: number, vendor: string) {
  return {
    assetDescription: args.farDescription.trim(),
    vendor: vendor || null,
    billNumber: args.farBillNumber.trim() || null,
    billDate: args.entryDate || null,
    cost,
    gst,
    depreciationPercent: Number(args.farDepPercent) || PVC_FAR_DEP_PERCENT,
  };
}

export function unloadingValues(args: SubmitExpenseUnloadingArgs) {
  const qty = Number(args.unloadQtyMt) > 0 ? Number(args.unloadQtyMt) : Number(args.calculatedUnloadMt);
  const rate = Number(args.unloadRatePerMt) > 0 ? Number(args.unloadRatePerMt) : PVC_UNLOADING_RATE_PER_MT;
  return { qty, rate, amount: qty * rate };
}

export function unloadingBody(args: SubmitExpenseUnloadingArgs, qty: number, rate: number, amount: number) {
  return {
    date: args.entryDate,
    shift: args.shift,
    payMode: args.expensePayMode,
    expenseHead: "Unloading of MT",
    description:
      [args.paidTo && `Paid to: ${args.paidTo}`, args.expenseDesc.trim() || `${qty} MT @ ₹${rate}/MT`]
        .filter(Boolean)
        .join(" · ") || null,
    openingReading: qty,
    closingReading: rate,
    amount,
    contractorSalary: 0,
    supervisorSalary: 0,
    billPhotoUrls: args.expensePhotos,
  };
}
