import { NextResponse } from "next/server";
import {
  requireCanEnterOrMachineProduction,
  requireSession,
} from "@/lib/api";
import { createBillUploadSignature } from "@/lib/cloudinary";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await requireSession();
  if ("error" in session) return session.error;

  const enterDenied = requireCanEnterOrMachineProduction(
    session.user.globalRole,
  );
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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart form with a file field" },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Each bill photo must be 8 MB or smaller" },
      { status: 400 },
    );
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WEBP image" },
      { status: 400 },
    );
  }

  const cloudForm = new FormData();
  cloudForm.append("file", file);
  cloudForm.append("api_key", signed.apiKey);
  cloudForm.append("timestamp", String(signed.timestamp));
  cloudForm.append("signature", signed.signature);
  cloudForm.append("folder", signed.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: "POST", body: cloudForm },
  );
  const json = (await res.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.secure_url) {
    return NextResponse.json(
      { error: json.error?.message ?? "Cloudinary upload failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, url: json.secure_url });
}