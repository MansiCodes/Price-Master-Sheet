/**
 * Amazon S3 helpers for bill/document uploads (local migration from Cloudinary).
 *
 * Env (when MEDIA_STORAGE=s3):
 *   AWS_REGION
 *   AWS_S3_BUCKET
 *   AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY  (or Amplify IAM role — omit keys)
 *   AWS_S3_PUBLIC_BASE_URL  optional CDN/custom domain, else https://{bucket}.s3.{region}.amazonaws.com
 */
import { createHash, randomBytes } from "node:crypto";
import { BILL_FOLDER, PRICE_SHEET_FOLDER } from "@/lib/storage/types";

export function getS3Config() {
  const region = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim();
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  if (!region || !bucket) return null;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const publicBase =
    process.env.AWS_S3_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "") ||
    `https://${bucket}.s3.${region}.amazonaws.com`;
  return {
    region,
    bucket,
    publicBase,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  };
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function buildObjectKey(folder: string, originalName: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const id = randomBytes(8).toString("hex");
  return `${folder}/${stamp}/${id}-${safeFileName(originalName)}`;
}

export function publicUrlForKey(key: string): string | null {
  const cfg = getS3Config();
  if (!cfg) return null;
  return `${cfg.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function isS3BillUrl(url: string): boolean {
  const cfg = getS3Config();
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (cfg?.publicBase) {
      const base = new URL(cfg.publicBase);
      if (parsed.hostname === base.hostname) return true;
    }
    // Accept common S3 host patterns even if env not loaded on client validate paths
    if (
      /\.s3[.-][a-z0-9-]+\.amazonaws\.com$/i.test(parsed.hostname) ||
      /^s3[.-][a-z0-9-]+\.amazonaws\.com$/i.test(parsed.hostname)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Dynamic import so Cloudinary-only deploys don't require AWS SDK until S3 is enabled. */
async function getS3Client() {
  const cfg = getS3Config();
  if (!cfg) return null;
  const { S3Client } = await import("@aws-sdk/client-s3");
  return {
    client: new S3Client({
      region: cfg.region,
      credentials: cfg.credentials,
    }),
    cfg,
  };
}

export async function createS3PresignedPut(params: {
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  headers: Record<string, string>;
} | null> {
  const loaded = await getS3Client();
  if (!loaded) return null;
  const { client, cfg } = loaded;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const key = buildObjectKey(params.folder ?? BILL_FOLDER, params.fileName);
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: params.contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  const publicUrl = `${cfg.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
  return {
    uploadUrl,
    publicUrl,
    key,
    headers: {
      "Content-Type": params.contentType || "application/octet-stream",
    },
  };
}

export async function uploadBufferToS3(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{ url: string } | { error: string }> {
  const loaded = await getS3Client();
  if (!loaded) {
    return {
      error:
        "S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET (and credentials if not using IAM role).",
    };
  }
  const { client, cfg } = loaded;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const key = buildObjectKey(params.folder ?? PRICE_SHEET_FOLDER, params.fileName);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "S3 upload failed",
    };
  }
  return {
    url: `${cfg.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`,
  };
}

/** Content hash helper if you later dedupe uploads by hash. */
export function fileSha1(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex");
}
