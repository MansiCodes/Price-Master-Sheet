import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds, isSuperAdmin } from "@/lib/rbac";
import { PlantChooser } from "@/components/select-plant/PlantChooser";
import "@/components/select-plant/plant-chooser.css";
import "./select-plant.css";

export default async function SelectPlantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  if (isSuperAdmin(user.globalRole)) {
    redirect("/");
  }

  const plantIds = await getAccessiblePlantIds(user.id);
  const plants =
    plantIds.length > 0
      ? await prisma.plant.findMany({
          where: { id: { in: plantIds }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : [];

  if (plants.length === 0) {
    return (
      <div className="select-plant-screen">
        <section className="select-plant-card">
          <h1 className="select-plant-card__title">No plant access</h1>
          <p className="select-plant-empty">
            Your account is not assigned to any plant yet. Contact the Super
            Admin to get access.
          </p>
        </section>
      </div>
    );
  }

  // One plant: no cookie write needed — resolveSelectedPlantId uses the only plant.
  if (plants.length === 1) {
    redirect("/welcome");
  }

  return (
    <div className="select-plant-screen">
      <section className="select-plant-card">
        <p className="select-plant-card__brand">Cable Junction</p>
        <h1 className="select-plant-card__title">Choose your plant</h1>
        <p className="select-plant-card__lead">
          Select which plant you want to work in today.
        </p>
        <PlantChooser plants={plants} />
      </section>
    </div>
  );
}
