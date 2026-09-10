"use client";

import { useRef, useState } from "react";

const MAX_PHOTOS = 20;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Machine-production photo/doc upload.
 * ACTIVE = Cloudinary. S3 commented until AWS bucket is ready.
 */
async function uploadFile(file: File): Promise<string> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const signed = (await signRes.json()) as {
    provider?: "cloudinary" | "s3";
    error?: string;
    cloudName?: string;
    apiKey?: string;
    folder?: string;
    timestamp?: number;
    signature?: string;
    // uploadUrl?: string;
    // publicUrl?: string;
    // headers?: Record<string, string>;
  };
  if (!signRes.ok) {
    throw new Error(signed.error ?? "Could not start photo upload");
  }

  // ========== ACTIVE: Cloudinary ==========
  if (signed.provider === "cloudinary" || signed.cloudName) {
    if (
      !signed.cloudName ||
      !signed.apiKey ||
      !signed.folder ||
      signed.timestamp == null ||
      !signed.signature
    ) {
      throw new Error("Invalid Cloudinary upload signature");
    }
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`,
      { method: "POST", body: form },
    );
    const json = (await res.json()) as {
      secure_url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.secure_url) {
      throw new Error(json.error?.message ?? "Upload failed");
    }
    return json.secure_url;
  }

  throw new Error("Unexpected upload provider response");

  // ========== FUTURE: Amazon S3 (commented) ==========
  // if (signed.provider === "s3") {
  //   if (!signed.uploadUrl || !signed.publicUrl) {
  //     throw new Error("Invalid S3 upload signature");
  //   }
  //   const put = await fetch(signed.uploadUrl, {
  //     method: "PUT",
  //     headers: signed.headers ?? {
  //       "Content-Type": file.type || "application/octet-stream",
  //     },
  //     body: file,
  //   });
  //   if (!put.ok) {
  //     throw new Error(`S3 upload failed (${put.status})`);
  //   }
  //   return signed.publicUrl;
  // }
}

export function LivePhotoUpload({
  urls,
  onChange,
  label = "Upload photos/documents (optional)",
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_PHOTOS - urls.length;

  async function onPick(files: FileList | null) {
    if (!files?.length || remaining <= 0) return;
    setError(null);
    setBusy(true);
    const next = [...urls];
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        if (file.size > MAX_BYTES) {
          throw new Error("Each file must be 8 MB or smaller");
        }
        const isImage = file.type && file.type.startsWith("image/");
        const isPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");
        const isDoc =
          file.name.toLowerCase().endsWith(".doc") ||
          file.name.toLowerCase().endsWith(".docx") ||
          file.name.toLowerCase().endsWith(".xls") ||
          file.name.toLowerCase().endsWith(".xlsx");
        if (!isImage && !isPdf && !isDoc) {
          throw new Error(
            "Only images (JPG, PNG, WEBP) or documents (PDF, DOC, XLS) are allowed",
          );
        }
        next.push(await uploadFile(file));
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bill-upload">
      <div className="bill-upload__head">
        <label>{label}</label>
        <span className="bill-upload__count">
          {urls.length}/{MAX_PHOTOS}
        </span>
      </div>
      <div className="bill-upload__row">
        {urls.map((url) => {
          const isPdf = url.toLowerCase().includes(".pdf");
          const isDoc =
            url.toLowerCase().includes(".doc") ||
            url.toLowerCase().includes(".docx") ||
            url.toLowerCase().includes(".xls") ||
            url.toLowerCase().includes(".xlsx");
          return (
            <div key={url} className="bill-upload__thumb">
              {isPdf || isDoc ? (
                <div className="bill-upload__doc-preview">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ color: "#127269" }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <span className="bill-upload__doc-label">
                    {isPdf ? "PDF" : "DOC"}
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="Live photo" />
              )}
              <button
                type="button"
                className="bill-upload__remove"
                aria-label="Remove file"
                onClick={() => onChange(urls.filter((u) => u !== url))}
              >
                ✕
              </button>
            </div>
          );
        })}
        {remaining > 0 ? (
          <button
            type="button"
            className="bill-upload__add"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "…" : "+"}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />
      {error ? <p className="bill-upload__error">{error}</p> : null}
    </div>
  );
}
