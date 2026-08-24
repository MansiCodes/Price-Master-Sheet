import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  getAccessiblePlantIds,
  isMachineSupervisor,
  isSuperAdmin,
} from "@/lib/rbac";
import { setSelectedPlantCookie } from "@/lib/selected-plant";
import { getPlantRmSummary, getPlantSegment } from "@/lib/plant-segments";
import { PlantChooser } from "@/components/select-plant/PlantChooser";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import "@/components/select-plant/plant-chooser.css";
import "./select-plant.css";

export default async function SelectPlantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("selectPlant");
  const user = session.user;
  if (isSuperAdmin(user.globalRole)) {
    redirect("/");
  }
  if (isMachineSupervisor(user.globalRole)) {
    redirect("/machine-production");
  }

  const plantIds = await getAccessiblePlantIds(user.id);
  const plantsRaw =
    plantIds.length > 0
      ? await prisma.plant.findMany({
          where: { id: { in: plantIds }, isActive: true },
          select: { id: true, name: true, code: true },
        })
      : [];

  const plants = plantsRaw
    .map((p) => ({
      ...p,
      rmSummary: getPlantRmSummary(p.code),
      sortOrder: getPlantSegment(p.code)?.sortOrder ?? 99,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  if (plants.length === 1) {
    const targetId = plants[0].id;
    await setSelectedPlantCookie(targetId);
    redirect(`/plants/${targetId}/today`);
  }

  if (plants.length === 0) {
    return (
      <div className="select-plant-screen">
        <div className="select-plant-screen__lang">
          <LanguageSwitcher />
        </div>
        <section className="select-plant-card">
          <h1 className="select-plant-card__title">{t("noAccessTitle")}</h1>
          <p className="select-plant-empty">{t("noAccessBody")}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="select-plant-screen">
      <div className="select-plant-screen__lang">
        <LanguageSwitcher />
      </div>
      <section className="select-plant-card">
        <p className="select-plant-card__brand">{t("brand")}</p>
        <h1 className="select-plant-card__title">{t("title")}</h1>
        <p className="select-plant-card__lead">{t("lead")}</p>
        <PlantChooser plants={plants} />
      </section>
    </div>
  );
}
