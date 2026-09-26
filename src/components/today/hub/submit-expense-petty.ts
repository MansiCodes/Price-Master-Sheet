import { postJson } from "@/lib/client-forms";
import { mapCat6PettyNature } from "@/lib/plant-layout";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type { SubmitExpensePettyArgs } from "@/components/today/hub/submit-args";

export async function submitExpensePettyCat6(args: SubmitExpensePettyArgs): Promise<SubmitOutcome> {
  const amount = Number(args.pettyCashExpense) || 0;
  if (!args.pettyNature.trim() || !args.pettyCashDescription.trim() || !args.pettyPerson.trim() || !(amount > 0)) {
    args.fail("Enter nature, description, person, and output amount.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, {
    date: args.entryDate,
    shift: args.shift,
    entryType: "PETTY_CASH",
    payMode: args.pettyPerson.trim(),
    expenseHead: mapCat6PettyNature(args.pettyNature),
    nature: args.pettyNature.trim(),
    description: args.pettyCashDescription.trim(),
    location: args.pettyLocation.trim() || null,
    checkedBy: args.pettyCheckedBy.trim() || null,
    approvedBy: args.pettyApprovedBy.trim() || null,
    amount,
    contractorSalary: 0,
    supervisorSalary: 0,
    billPhotoUrls: args.pettyCashPhotos,
  });
  return { status: "ok", result };
}

export async function submitExpensePettyDefault(args: SubmitExpensePettyArgs): Promise<SubmitOutcome> {
  const amount = Number(args.pettyCashExpense) || 0;
  const contractorSalary = Number(args.pettyCashContractorSalary) || 0;
  const supervisorSalary = Number(args.pettyCashSupervisorSalary) || 0;
  if (!args.pettyCashPayMode.trim() || !args.pettyCashDescription.trim() || amount + contractorSalary + supervisorSalary <= 0) {
    args.fail(args.enterPettyCashMsg);
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/petty-cash`, {
    date: args.entryDate,
    shift: args.shift,
    entryType: "PETTY_CASH",
    payMode: args.pettyCashPayMode.trim(),
    expenseHead: "Petty Cash",
    description: args.pettyCashDescription.trim(),
    billNumber: args.pettyCashBillNumber.trim() || null,
    amount,
    contractorSalary,
    supervisorSalary,
    billPhotoUrls: args.pettyCashPhotos,
  });
  return { status: "ok", result };
}
