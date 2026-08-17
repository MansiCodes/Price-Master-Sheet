"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions/locale";
import type { AppLocale } from "@/i18n/config";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: AppLocale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className={`lang-switch${compact ? " lang-switch--compact" : ""}`}
      role="group"
      aria-label={t("language")}
    >
      <button
        type="button"
        className={`lang-switch__btn${locale === "en" ? " is-active" : ""}`}
        disabled={pending}
        aria-pressed={locale === "en"}
        onClick={() => choose("en")}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-switch__btn${locale === "hi" ? " is-active" : ""}`}
        disabled={pending}
        aria-pressed={locale === "hi"}
        onClick={() => choose("hi")}
      >
        हिं
      </button>
    </div>
  );
}
