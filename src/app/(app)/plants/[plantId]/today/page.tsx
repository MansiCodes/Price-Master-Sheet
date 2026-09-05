import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Today is merged into the main Dashboard. */
export default function PlantTodayRedirect() {
  redirect("/");
}
