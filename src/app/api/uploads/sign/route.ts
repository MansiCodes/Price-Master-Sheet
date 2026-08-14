import { NextResponse } from "next/server";
import { requireCanEnter, requireSession } from "@/lib/api";
import { createBillUploadSignature } from "@/lib/cloudinary";

export async function POST() {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnter(session.user.globalRole);
  if (enterDenied) return enterDenied;

  const signed = createBillUploadSignature();
  if (!signed) {
    return NextResponse.json(
      {
        error:
          "Bill upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, ...signed });
}
