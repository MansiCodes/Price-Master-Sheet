import { postJson } from "@/lib/client-forms";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type {
  SubmitExpenseGenericArgs,
  SubmitExpenseLabourArgs,
  SubmitExpensePettyArgs,
  SubmitExpenseSalaryArgs,
  SubmitExpenseUpcastMiscArgs,
} from "@/components/today/hub/submit-args";
import {
  genericExpenseBody,
  labourExpenseBody,
  salaryExpenseBody,
  upcastMiscExpenseBody,
} from "@/components/today/hub/build-expense-payloads";
import {
  submitExpensePettyCat6,
  submitExpensePettyDefault,
} from "@/components/today/hub/submit-expense-petty";

export async function submitExpenseLabour(args: SubmitExpenseLabourArgs): Promise<SubmitOutcome> {
  const amount = Number(args.expenseAmount);
  if (!(amount > 0)) {
    args.fail("Enter contractor wages amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, labourExpenseBody(args, amount));
  return { status: "ok", result };
}

export async function submitExpenseSalary(args: SubmitExpenseSalaryArgs): Promise<SubmitOutcome> {
  const amount = Number(args.expenseAmount);
  if (!(amount > 0)) {
    args.fail("Enter salary amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, salaryExpenseBody(args, amount));
  return { status: "ok", result };
}

export async function submitExpenseUpcastMisc(args: SubmitExpenseUpcastMiscArgs): Promise<SubmitOutcome> {
  const amount = Number(args.expenseAmount);
  const nature = args.upcastMiscNature.trim();
  if (!(amount > 0) || !nature) {
    args.fail("Select nature of expense and enter amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, upcastMiscExpenseBody(args, amount, nature));
  return { status: "ok", result };
}

export async function submitExpensePetty(args: SubmitExpensePettyArgs): Promise<SubmitOutcome> {
  return args.isCat6 ? submitExpensePettyCat6(args) : submitExpensePettyDefault(args);
}

export async function submitExpenseGeneric(args: SubmitExpenseGenericArgs): Promise<SubmitOutcome> {
  const amount = Number(args.expenseAmount);
  if (!(amount > 0) || !args.expenseHead) {
    args.fail(args.enterCategoryAmountMsg);
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, genericExpenseBody(args, amount));
  return { status: "ok", result };
}
