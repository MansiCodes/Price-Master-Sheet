import { redirect } from "next/navigation";

/** Today is merged into the main Dashboard. */
export default function PlantTodayRedirect() {
  redirect("/");
}
