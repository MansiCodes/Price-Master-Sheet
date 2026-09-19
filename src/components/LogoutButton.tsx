"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  const t = useTranslations("common");
  return (
    <form action={logoutAction} className="dash-header__logout-form">
      <button
        type="submit"
        className="dash-header__logout"
        title={t("logout")}
        aria-label={t("logout")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="dash-header__logout-icon"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="dash-header__logout-text">{t("logout")}</span>
      </button>
    </form>
  );
}
