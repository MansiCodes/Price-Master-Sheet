import { redirect } from "next/navigation";
import {
  isPortalLoginDelegated,
  portalPublicUrl,
} from "@/lib/central/portal-public-url";

/** App chooser lives on Installation portal when configured; Amplify P&L stays home. */
export default function AppsPage() {
  if (isPortalLoginDelegated()) {
    redirect(`${portalPublicUrl()}/apps`);
  }
  redirect("/");
}
