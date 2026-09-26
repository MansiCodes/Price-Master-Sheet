import { postJson } from "@/lib/client-forms";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type {
  SubmitExpenseElectricityArgs,
  SubmitExpenseFactoryRentArgs,
  SubmitExpenseFarArgs,
  SubmitExpenseUnloadingArgs,
} from "@/components/today/hub/submit-args";
import {
  electricityBody,
  electricityValues,
  factoryRentBody,
  factoryRentValues,
  farBody,
  farValues,
  unloadingBody,
  unloadingValues,
} from "@/components/today/hub/build-expense-special-payloads";

export async function submitExpenseFactoryRent(args: SubmitExpenseFactoryRentArgs): Promise<SubmitOutcome> {
  const { area, rate, rentAmount } = factoryRentValues(args);
  if (!(rentAmount > 0)) {
    args.fail("Enter covered area × rate or a rent amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/electricity`, factoryRentBody(args, area, rate, rentAmount));
  return { status: "ok", result };
}

export async function submitExpenseElectricity(args: SubmitExpenseElectricityArgs): Promise<SubmitOutcome> {
  const values = electricityValues(args);
  if (!(values.billAmount >= 0) || !Number.isFinite(values.billAmount)) {
    args.fail("Enter a valid electricity bill amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/electricity`, electricityBody(args, values));
  return { status: "ok", result };
}

export async function submitExpenseFar(args: SubmitExpenseFarArgs): Promise<SubmitOutcome> {
  const { cost, gst, vendor } = farValues(args);
  if (!args.farDescription.trim() || !(cost > 0)) {
    args.fail("Enter asset description and actual cost.");
    return { status: "failed" };
  }
  if (!(gst >= 0)) {
    args.fail("Enter a valid GST amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/assets`, farBody(args, cost, gst, vendor));
  return { status: "ok", result };
}

export async function submitExpenseUnloading(args: SubmitExpenseUnloadingArgs): Promise<SubmitOutcome> {
  const { qty, rate, amount } = unloadingValues(args);
  if (!(qty > 0) || !(amount > 0)) {
    args.fail("Enter unloading MT manually, or enter purchases for this date to auto-calculate.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, unloadingBody(args, qty, rate, amount));
  return { status: "ok", result };
}
