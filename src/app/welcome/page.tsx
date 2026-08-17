import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds, isSuperAdmin } from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { WelcomeRedirect } from "@/components/welcome/WelcomeRedirect";
import "./welcome.css";

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  if (isSuperAdmin(user.globalRole)) {
    redirect("/");
  }

  const plantIds = await getAccessiblePlantIds(user.id);
  if (plantIds.length === 0) {
    redirect("/select-plant");
  }

  const selectedPlantId = await resolveSelectedPlantId(user.id);
  if (!selectedPlantId) {
    redirect("/select-plant");
  }

  const plant = await prisma.plant.findUnique({
    where: { id: selectedPlantId },
    select: { name: true },
  });

  if (!plant) {
    redirect("/select-plant");
  }

  return <WelcomeRedirect plantName={plant.name} />;
}
