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

/**
 * Signed delivery URL for assets that Cloudinary blocks unsigned
 * (common for PDF/ZIP under Restricted media types → 401 without signature).
 * @see https://cloudinary.com/documentation/delivery_url_signatures
 */
export function signCloudinaryDeliveryUrl(params: {
  cloudName: string;
  apiSecret: string;
  resourceType?: "raw" | "image" | "video";
  version: string | number;
  /** Full public_id including folders; with or without extension */
  publicId: string;
  /** When set, ensure public_id ends with this extension in the signed path */
  format?: string | null;
}): string {
  const resourceType = params.resourceType ?? "raw";
  const publicId = params.publicId.replace(/^\//, "");
  const format = params.format?.replace(/^\./, "") || "";
  const withExt =
    format && !publicId.toLowerCase().endsWith(`.${format.toLowerCase()}`)
      ? `${publicId}.${format}`
      : publicId;
  const pathAfterSignature = `v${params.version}/${withExt}`;
  const digest = createHash("sha1")
    .update(`${pathAfterSignature}${params.apiSecret}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  const signature = digest.slice(0, 8);
  return `https://res.cloudinary.com/${params.cloudName}/${resourceType}/upload/s--${signature}--/${pathAfterSignature}`;
}

async function assertPdfUrlDownloadable(
  url: string,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  try {
    const probe = await fetch(url, { method: "GET", redirect: "follow" });
    const contentType = (probe.headers.get("content-type") || "").toLowerCase();
    const cldError = probe.headers.get("x-cld-error");
    // Cloudinary often returns a tiny GIF placeholder for blocked/missing assets
    const looksLikePdf =
      contentType.includes("pdf") ||
      contentType.includes("octet-stream") ||
      contentType.includes("application/raw");
    if (!probe.ok || cldError || !looksLikePdf) {
      return {
        ok: false,
        status: probe.status,
        detail: cldError || contentType || "not a PDF",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "network error",
    };
  }
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

const PRICE_SHEET_FOLDER = "plant-pnl/price-sheets";

/** Upload a price-sheet PDF and return a publicly downloadable HTTPS URL for WhatsApp. */
export async function uploadPriceSheetPdf(params: {
  buffer: Buffer;
  filename: string;
}): Promise<{ url: string } | { error: string }> {
  const config = getCloudinaryConfig();
  if (!config) {
    return {
      error:
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to share PDFs.",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Unique id; include .pdf so raw delivery paths stay consistent
  const baseName = params.filename.replace(/\.pdf$/i, "");
  const publicId = `${baseName}-${timestamp}.pdf`;
  const signParams = {
    folder: PRICE_SHEET_FOLDER,
    public_id: publicId,
    timestamp,
  };
  const signature = signCloudinaryParams(signParams, config.apiSecret);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(params.buffer)], { type: "application/pdf" }),
    params.filename,
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", PRICE_SHEET_FOLDER);
  form.append("public_id", publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/raw/upload`,
    { method: "POST", body: form },
  );
  const json = (await res.json()) as {
    secure_url?: string;
    public_id?: string;
    version?: number | string;
    format?: string;
    error?: { message?: string };
  };

  if (!res.ok || !json.secure_url) {
    return {
      error: json.error?.message ?? "Could not upload price sheet PDF",
    };
  }

  // Prefer Cloudinary's own URL; fall back to signed delivery if PDF is restricted
  const candidates: string[] = [json.secure_url];
  if (json.public_id != null && json.version != null) {
    candidates.push(
      signCloudinaryDeliveryUrl({
        cloudName: config.cloudName,
        apiSecret: config.apiSecret,
        resourceType: "raw",
        version: json.version,
        publicId: json.public_id,
        format: null,
      }),
    );
    if (!json.public_id.toLowerCase().endsWith(".pdf")) {
      candidates.push(
        signCloudinaryDeliveryUrl({
          cloudName: config.cloudName,
          apiSecret: config.apiSecret,
          resourceType: "raw",
          version: json.version,
          publicId: json.public_id,
          format: "pdf",
        }),
      );
    }
  }

  let url: string | null = null;
  let lastFail = "";
  for (const candidate of [...new Set(candidates)]) {
    const probe = await assertPdfUrlDownloadable(candidate);
    if (probe.ok) {
      url = candidate;
      break;
    }
    lastFail = `HTTP ${probe.status} (${probe.detail})`;
    console.warn("[cloudinary] PDF URL not downloadable", {
      candidate,
      status: probe.status,
      detail: probe.detail,
    });
  }

  if (!url) {
    return {
      error:
        `PDF uploaded but not publicly downloadable${lastFail ? ` — ${lastFail}` : ""}. ` +
        `In Cloudinary → Settings → Security, enable "Allow delivery of PDF and ZIP files", click Save, then try Share again.`,
    };
  }

  return { url };
}
