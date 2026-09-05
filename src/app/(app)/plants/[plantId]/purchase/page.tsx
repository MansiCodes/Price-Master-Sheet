import { redirect } from "next/navigation";

type Props = { params: Promise<{ plantId: string }> };

/** Legacy daily-entry routes collapse into the unified TODAY hub. */
export default async function LegacyPurchaseRedirect({ params }: Props) {
  const { plantId } = await params;
  redirect(`/plants/${plantId}/today`);
}
