import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds, hasGlobalPlantAccess } from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { getPlantDisplayName } from "@/lib/plant-segments";
import { WelcomeRedirect } from "@/components/welcome/WelcomeRedirect";
import "./welcome.css";

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const plantIds = await getAccessiblePlantIds(user.id);
  if (plantIds.length === 0) {
    redirect("/");
  }

  const selectedPlantId = await resolveSelectedPlantId(user.id, {
    hasGlobalPlantAccess: hasGlobalPlantAccess(user.globalRole),
  });
  if (!selectedPlantId) {
    redirect("/");
  }

  const plant = await prisma.plant.findUnique({
    where: { id: selectedPlantId },
    select: { name: true, code: true },
  });

  if (!plant) {
    redirect("/");
  }

  return (
    <WelcomeRedirect
      plantName={getPlantDisplayName(plant.code, plant.name)}
    />
  );
}
