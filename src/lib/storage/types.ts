/**
 * Media storage provider switch (Cloudinary ↔ Amazon S3).
 *
 * ACTIVE: Cloudinary for NEW uploads (current production path).
 * S3 path is commented — turn it on after the AWS bucket + keys are ready.
 *
 * Old images: whichever URL is stored in DB (Cloudinary or S3) can still display
 * once both URL checks are enabled in isAllowedBillUrl.
 */

export type UploadSignResponse =
  | {
      provider: "cloudinary";
      cloudName: string;
      apiKey: string;
      folder: string;
      timestamp: number;
      signature: string;
    }
  | {
      provider: "s3";
      uploadUrl: string;
      publicUrl: string;
      key: string;
      headers?: Record<string, string>;
    };

export const MAX_BILL_PHOTOS = 5;
export const BILL_FOLDER = "plant-pnl/bills";
export const PRICE_SHEET_FOLDER = "plant-pnl/price-sheets";

/**
 * ACTIVE = Cloudinary.
 * When S3 is ready: set MEDIA_STORAGE=s3 in .env and switch return to "s3"
 * (or uncomment the env-based block below).
 */
export function getMediaStorageProvider(): "s3" | "cloudinary" {
  // --- ACTIVE: Cloudinary ---
  return "cloudinary";

  // --- When S3 bucket is ready ---
  // return "s3";
  // Or:
  // const raw = (process.env.MEDIA_STORAGE ?? "cloudinary").trim().toLowerCase();
  // return raw === "s3" ? "s3" : "cloudinary";
}
