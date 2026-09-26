export type LoginMode = "whatsapp" | "email";
export type WhatsappStep = "phone" | "otp";

/** Drop legacy Auth.js cookies so Edge middleware stops trying to decrypt them. */
export function clearStaleAuthCookies() {
  const stale = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "cj.session-token",
    "cj.session-token.v2",
    "__Secure-cj.session-token.v2",
  ];
  for (const name of stale) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (let i = 0; i < 5; i += 1) {
      document.cookie = `${name}.${i}=; Max-Age=0; path=/`;
    }
  }
}

export function setRememberMeCookie(remember: boolean) {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  if (remember) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `cj.remember-me=true; path=/; expires=${expires}; SameSite=Lax${secure}`;
  } else {
    document.cookie = `cj.remember-me=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}
