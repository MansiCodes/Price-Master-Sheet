/**
 * Upload signing + PDF upload.
 *
 * ACTIVE path = Cloudinary.
 * Amazon S3 code is commented below — enable after bucket + IAM keys exist.
 */
import {
  createBillUploadSignature,
  getCloudinaryConfig,
  isCloudinaryBillUrl,
  uploadPriceSheetPdf as uploadPriceSheetPdfCloudinary,
} from "@/lib/cloudinary";
import {
  // --- S3 (UPLOAD turned off until bucket is ready) ---
  // createS3PresignedPut,
  // getS3Config,
  isS3BillUrl,
  // uploadBufferToS3,
} from "@/lib/storage/s3";
import {
  // BILL_FOLDER,
  getMediaStorageProvider,
  MAX_BILL_PHOTOS,
  type UploadSignResponse,
} from "@/lib/storage/types";

export { MAX_BILL_PHOTOS, getMediaStorageProvider };
export type { UploadSignResponse };

/**
 * Allow Cloudinary URLs (active) and S3 URLs (if any were saved later).
 */
export function isAllowedBillUrl(url: string): boolean {
  const cloudName = getCloudinaryConfig()?.cloudName;
  return isCloudinaryBillUrl(url, cloudName) || isS3BillUrl(url);
}

export function normalizeBillPhotoUrls(
  urls: string[] | undefined,
  legacyUrl?: string | null,
): { billPhotoUrls: string[]; billPhotoUrl: string | null } {
  const merged = [...(urls ?? [])];
  if (legacyUrl) merged.unshift(legacyUrl);
  const unique = [
    ...new Set(
      merged
        .map((u) => u.trim())
        .filter((u) => u && isAllowedBillUrl(u)),
    ),
  ].slice(0, MAX_BILL_PHOTOS);
  return {
    billPhotoUrls: unique,
    billPhotoUrl: unique[0] ?? null,
  };
}

/** Sign a NEW upload — Cloudinary active (S3 commented). */
export async function createUploadSign(params?: {
  fileName?: string;
  contentType?: string;
}): Promise<UploadSignResponse | null> {
  void params; // used when S3 is enabled (fileName / contentType)
  void getMediaStorageProvider();

  // ========== ACTIVE: Cloudinary ==========
  // Server returns apiKey + timestamp + signature + folder.
  // Browser POSTs multipart FormData to api.cloudinary.com → secure_url.
  const signed = createBillUploadSignature();
  if (!signed) return null;
  return { provider: "cloudinary", ...signed };

  // ========== FUTURE: Amazon S3 (commented until bucket is ready) ==========
  // Difference vs Cloudinary:
  // - Needs fileName + contentType from the client
  // - Returns uploadUrl (presigned PUT) + publicUrl
  // - Browser PUTs raw file bytes to S3; we save publicUrl in DB
  //
  // if (!getS3Config()) return null;
  // const fileName = params?.fileName?.trim() || `upload-${Date.now()}`;
  // const contentType =
  //   params?.contentType?.trim() || "application/octet-stream";
  // const s3Signed = await createS3PresignedPut({
  //   fileName,
  //   contentType,
  //   folder: BILL_FOLDER,
  // });
  // if (!s3Signed) return null;
  // return {
  //   provider: "s3",
  //   uploadUrl: s3Signed.uploadUrl,
  //   publicUrl: s3Signed.publicUrl,
  //   key: s3Signed.key,
  //   headers: s3Signed.headers,
  // };
}

/** Price-sheet PDF — Cloudinary active (S3 commented). */
export async function uploadPriceSheetPdf(params: {
  buffer: Buffer;
  filename: string;
}): Promise<{ url: string } | { error: string }> {
  // ========== ACTIVE: Cloudinary ==========
  return uploadPriceSheetPdfCloudinary(params);

  // ========== FUTURE: Amazon S3 (commented) ==========
  // return uploadBufferToS3({
  //   buffer: params.buffer,
  //   fileName: params.filename,
  //   contentType: "application/pdf",
  // });
}
