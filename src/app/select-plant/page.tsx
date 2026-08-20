import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds, isSuperAdmin } from "@/lib/rbac";
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
