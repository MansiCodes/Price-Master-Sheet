import { createHash } from "node:crypto";

const MAX_BILL_PHOTOS = 3;
const FOLDER = "plant-pnl/bills";

export function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function signCloudinaryParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

export function createBillUploadSignature() {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: FOLDER, timestamp };
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    folder: FOLDER,
    timestamp,
    signature: signCloudinaryParams(params, config.apiSecret),
  };
}

export function isCloudinaryBillUrl(url: string, cloudName?: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "res.cloudinary.com") return false;
    if (cloudName && !parsed.pathname.startsWith(`/${cloudName}/`)) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeBillPhotoUrls(
  urls: string[] | undefined,
  legacyUrl?: string | null,
): { billPhotoUrls: string[]; billPhotoUrl: string | null } {
  const cloudName = getCloudinaryConfig()?.cloudName;
  const merged = [...(urls ?? [])];
  if (legacyUrl) merged.unshift(legacyUrl);
  const unique = [
    ...new Set(
      merged
        .map((u) => u.trim())
        .filter((u) => u && isCloudinaryBillUrl(u, cloudName)),
    ),
  ].slice(0, MAX_BILL_PHOTOS);
  return {
    billPhotoUrls: unique,
    billPhotoUrl: unique[0] ?? null,
  };
}

export { MAX_BILL_PHOTOS, FOLDER as CLOUDINARY_BILL_FOLDER };
