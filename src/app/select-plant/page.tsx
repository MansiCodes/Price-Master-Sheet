import { redirect } from "next/navigation";

/** Plant picker removed — login goes to the dashboard; switch plants in the sidebar. */
export default function SelectPlantPage() {
  redirect("/");
}
