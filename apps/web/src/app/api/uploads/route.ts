import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "File uploads are unavailable: BLOB_READ_WRITE_TOKEN is not configured",
      },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  let filename: string;
  let body: Blob | Buffer | ArrayBuffer | string;
  let contentTypeForPut: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const nameField = form.get("filename");

      if (file instanceof File) {
        filename =
          (typeof nameField === "string" && nameField.trim()) ||
          file.name ||
          `upload-${Date.now()}`;
        body = file;
        contentTypeForPut = file.type || undefined;
      } else if (typeof nameField === "string" && nameField.trim()) {
        return NextResponse.json(
          { ok: false, message: "Missing file in multipart upload" },
          { status: 400 },
        );
      } else {
        return NextResponse.json(
          { ok: false, message: "Expected file field" },
          { status: 400 },
        );
      }
    } else {
      const json = (await request.json()) as {
        filename?: string;
        data?: string;
        contentType?: string;
      };
      if (!json.filename?.trim()) {
        return NextResponse.json(
          { ok: false, message: "filename is required" },
          { status: 400 },
        );
      }
      filename = json.filename.trim();
      if (json.data) {
        const base64 = json.data.includes(",")
          ? json.data.split(",")[1]!
          : json.data;
        body = Buffer.from(base64, "base64");
      } else {
        body = Buffer.from("");
      }
      contentTypeForPut = json.contentType;
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid upload payload" },
      { status: 400 },
    );
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `uploads/${session.user.id}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, body, {
    access: "public",
    contentType: contentTypeForPut,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ ok: true, url: blob.url, pathname: blob.pathname });
}
