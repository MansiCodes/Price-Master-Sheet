import { cookies } from "next/headers";
import {
  defaultLocale,
  isAppLocale,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/i18n/config";

export async function getLocaleFromCookie(): Promise<AppLocale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return isAppLocale(raw) ? raw : defaultLocale;
}

export async function setLocaleCookie(locale: AppLocale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
