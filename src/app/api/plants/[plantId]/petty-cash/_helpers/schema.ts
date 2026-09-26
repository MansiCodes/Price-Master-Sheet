import { ManpowerShift, PettyCashKind } from "@prisma/client";
import { z } from "zod";
import { dateOnlyRegex } from "@/lib/dates";

export type PettyCashRouteContext = { params: Promise<{ plantId: string }> };

export const pettyCashSchema = z.object({
  date: z.string().regex(dateOnlyRegex),
  shift: z.enum(ManpowerShift).default(ManpowerShift.DAY),
  entryType: z.enum(PettyCashKind).default(PettyCashKind.EXPENSE),
  payMode: z.string().min(1),
  expenseHead: z.string().min(1),
  nature: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  checkedBy: z.string().optional().nullable(),
  approvedBy: z.string().optional().nullable(),
  openingReading: z.coerce.number().nonnegative().optional().nullable(),
  closingReading: z.coerce.number().nonnegative().optional().nullable(),
  billNumber: z.string().optional().nullable(),
  amount: z.coerce.number().nonnegative().default(0),
  contractorSalary: z.coerce.number().nonnegative().default(0),
  supervisorSalary: z.coerce.number().nonnegative().default(0),
  billPhotoUrl: z.string().url().optional().nullable(),
  billPhotoUrls: z.array(z.string().url()).max(20).optional(),
});
