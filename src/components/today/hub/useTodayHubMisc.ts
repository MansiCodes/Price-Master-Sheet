import { useTodayHubMiscProd } from "@/components/today/hub/useTodayHubMiscProd";
import { useTodayHubMiscPetty } from "@/components/today/hub/useTodayHubMiscPetty";
import { useTodayHubMiscContact } from "@/components/today/hub/useTodayHubMiscContact";

export function useTodayHubMisc() {
  const prod = useTodayHubMiscProd();
  const petty = useTodayHubMiscPetty();
  const contact = useTodayHubMiscContact();
  return { ...prod, ...petty, ...contact };
}

export type TodayHubMisc = ReturnType<typeof useTodayHubMisc>;
