import type {
  SubmitExpenseGenericArgs,
  SubmitExpenseLabourArgs,
  SubmitExpenseSalaryArgs,
  SubmitExpenseUpcastMiscArgs,
} from "@/components/today/hub/submit-args";

export function labourExpenseBody(args: SubmitExpenseLabourArgs, amount: number) {
  return {
    date: args.entryDate,
    shift: args.shift,
    entryType: "EXPENSE",
    payMode: args.expensePayMode,
    expenseHead: args.isUpcast ? "Contractor Wages" : "Labour Contractor",
    description: [args.paidTo && `Paid to: ${args.paidTo}`, args.expenseDesc.trim() || "Contractor wages"]
      .filter(Boolean)
      .join(" · "),
    amount,
    contractorSalary: 0,
    supervisorSalary: 0,
    billPhotoUrls: args.expensePhotos,
  };
}

export function salaryExpenseBody(args: SubmitExpenseSalaryArgs, amount: number) {
  return {
    date: args.entryDate,
    shift: args.shift,
    entryType: "EXPENSE",
    payMode: args.expensePayMode,
    expenseHead: "Salary Expenses",
    description: [args.paidTo && `Paid to: ${args.paidTo}`, args.expenseDesc.trim() || "Salary expenses"]
      .filter(Boolean)
      .join(" · "),
    amount,
    contractorSalary: 0,
    supervisorSalary: 0,
    billPhotoUrls: args.expensePhotos,
  };
}

export function upcastMiscExpenseBody(args: SubmitExpenseUpcastMiscArgs, amount: number, nature: string) {
  return {
    date: args.entryDate,
    shift: args.shift,
    entryType: "EXPENSE",
    payMode: args.expensePayMode,
    expenseHead: nature,
    nature,
    description: [args.paidTo && `Paid to: ${args.paidTo}`, args.expenseDesc.trim()].filter(Boolean).join(" · ") || nature,
    amount,
    contractorSalary: 0,
    supervisorSalary: 0,
    billPhotoUrls: args.expensePhotos,
  };
}

export function genericExpensePayMode(args: SubmitExpenseGenericArgs) {
  if (args.isCat6) return "CASH";
  if (args.isPvcStyleExpense) return args.expensePayMode;
  return args.paidTo.trim() || "CASH";
}

export function genericExpenseDescription(args: SubmitExpenseGenericArgs) {
  if (args.isCat6) {
    return args.expenseDesc.trim() || (args.expenseHead === "Miscellaneous" ? "Salary" : "");
  }
  return [args.paidTo && `Paid to: ${args.paidTo}`, args.expenseDesc].filter(Boolean).join(" · ");
}

export function genericExpenseBody(args: SubmitExpenseGenericArgs, amount: number) {
  return {
    date: args.entryDate,
    shift: args.shift,
    entryType: "EXPENSE",
    payMode: genericExpensePayMode(args),
    expenseHead: String(args.expenseHead),
    description: genericExpenseDescription(args) || null,
    openingReading: null,
    closingReading: null,
    amount,
    contractorSalary: 0,
    supervisorSalary: 0,
    billPhotoUrls: args.expensePhotos,
  };
}
