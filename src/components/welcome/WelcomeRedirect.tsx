"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const REDIRECT_DELAY_MS = 2200;

export function WelcomeRedirect({ plantName }: { plantName: string }) {
  const router = useRouter();
  const t = useTranslations("welcome");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/");
    }, REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="welcome-screen">
      <section className="welcome-card" role="status" aria-live="polite">
        <div className="welcome-card__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6" />
          </svg>
        </div>
        <p className="welcome-card__eyebrow">{t("eyebrow")}</p>
        <h1 className="welcome-card__plant">{plantName}</h1>
        <p className="welcome-card__hint">{t("hint")}</p>
        <div className="welcome-card__bar" aria-hidden="true">
          <span />
        </div>
      </section>
    </div>
  );
}
