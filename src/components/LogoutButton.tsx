"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  const t = useTranslations("common");
  return (
    <form action={logoutAction} className="dash-header__logout-form">
      <button type="submit" className="dash-header__logout">
        {t("logout")}
      </button>
    </form>
  );
}
