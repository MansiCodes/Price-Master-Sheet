import { NextRequest, NextResponse } from "next/server";
import { requireCanEnterOrMachineProduction, requireSession } from "@/lib/api";
import { createUploadSign } from "@/lib/storage";

/**
 * Returns upload credentials for the browser.
 * ACTIVE = Cloudinary signature (apiKey, timestamp, signature, folder).
 * S3 response shape is ready in @/lib/storage when you uncomment S3 there.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterOrMachineProduction(session.user);
  if (enterDenied) return enterDenied;

  let fileName: string | undefined;
  let contentType: string | undefined;
  try {
    const body = (await request.json()) as {
      fileName?: string;
      contentType?: string;
    };
    fileName = body.fileName;
    contentType = body.contentType;
  } catch {
    /* Cloudinary sign does not require a body */
  }

  const signed = await createUploadSign({ fileName, contentType });
  if (!signed) {
    return NextResponse.json(
      {
        error:
          "Bill upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        // When using S3 instead:
        // "Bill upload is not configured. Set AWS_REGION, AWS_S3_BUCKET (and AWS credentials or IAM role).",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, ...signed });
}
