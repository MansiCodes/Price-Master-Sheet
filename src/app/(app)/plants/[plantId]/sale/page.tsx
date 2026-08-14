import { redirect } from "next/navigation";

type Props = { params: Promise<{ plantId: string }> };

export default async function LegacySaleRedirect({ params }: Props) {
  const { plantId } = await params;
  redirect(`/plants/${plantId}/today`);
}
