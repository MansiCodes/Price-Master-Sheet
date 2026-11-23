/** Installation / centralisation portal origin (login + /apps). */

function configuredPortalOrigin(): string | null {
  const raw = (
    process.env.PORTAL_PUBLIC_URL ||
    process.env.WORKSPACE_PUBLIC_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (!raw) return null;
  if (/localhost|127\.0\.0\.1/i.test(raw)) return null;
  return raw;
}

/**
 * True only when a real portal URL is configured.
 * Amplify standalone P&L leaves this unset → login stays on Amplify.
 * Centralisation / EC2 sets PORTAL_PUBLIC_URL → login is delegated.
 */
export function isPortalLoginDelegated(): boolean {
  return configuredPortalOrigin() != null;
}

/** Installation portal (login + /apps) public origin. */
export function portalPublicUrl(): string {
  return configuredPortalOrigin() || "http://localhost:5173";
}
