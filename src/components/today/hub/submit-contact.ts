import { postJson } from "@/lib/client-forms";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";

export async function submitContact(args: {
  plantId: string;
  contactName: string;
  contactPhone: string;
  contactCategory: string;
  contactDesignation: string;
  fail: FailFn;
}): Promise<SubmitOutcome> {
  if (!args.contactName.trim()) {
    args.fail("Enter contact name.");
    return { status: "failed" };
  }
  const result = await postJson(`/api/plants/${args.plantId}/contacts`, {
    name: args.contactName.trim(),
    phone: args.contactPhone.trim() || null,
    category: args.contactCategory.trim() || null,
    designation: args.contactDesignation.trim() || null,
  });
  return { status: "ok", result };
}
