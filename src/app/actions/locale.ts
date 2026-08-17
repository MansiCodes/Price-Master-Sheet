"use server";

import { revalidatePath } from "next/cache";
import { isAppLocale, type AppLocale } from "@/i18n/config";
import { setLocaleCookie } from "@/lib/locale";

export async function setLocaleAction(locale: string) {
  if (!isAppLocale(locale)) {
    throw new Error("Unsupported locale");
  }
  await setLocaleCookie(locale as AppLocale);
  revalidatePath("/", "layout");
}
