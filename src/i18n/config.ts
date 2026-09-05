export const locales = ["en", "hi"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";
export const LOCALE_COOKIE = "cj.locale";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "en" || value === "hi";
}

export function localeToBcp47(locale: AppLocale): string {
  return locale === "hi" ? "hi-IN" : "en-IN";
}
