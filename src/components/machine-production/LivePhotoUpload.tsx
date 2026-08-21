"use client";

import { useRef, useState } from "react";

const MAX_PHOTOS = 1;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

type SignPayload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
};

async function uploadToCloudinary(file: File): Promise<string> {
  const signRes = await fetch("/api/uploads/sign", { method: "POST" });
  const signed = (await signRes.json()) as SignPayload & { error?: string };
  if (!signRes.ok) {
    throw new Error(signed.error ?? "Could not start photo upload");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
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

export function LivePhotoUpload({
  urls,
  onChange,
  label = "Live photo",
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
    try {
      const file = files[0]!;
      if (file.size > MAX_BYTES) {
        throw new Error("Photo must be 8 MB or smaller");
      }
      if (file.type && !file.type.startsWith("image/")) {
        throw new Error("Use a JPG, PNG, or WEBP image");
      }
      onChange([await uploadToCloudinary(file)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bill-upload mp-live-photo">
      <div className="bill-upload__head">
        <label>{label}</label>
        <span className="bill-upload__count">
          {urls.length}/{MAX_PHOTOS}
        </span>
      </div>
      <div className="bill-upload__row">
        {urls.map((url) => (
          <div key={url} className="bill-upload__thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Live production photo" />
            <button
              type="button"
              className="bill-upload__remove"
              aria-label="Remove photo"
              onClick={() => onChange([])}
            >
              ✕
            </button>
          </div>
        ))}
        {remaining > 0 ? (
          <button
            type="button"
            className="bill-upload__add"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "📷 Capture / upload"}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        hidden
        onChange={(e) => void onPick(e.target.files)}
      />
      {error ? <p className="bill-upload__error">{error}</p> : null}
    </div>
  );
}
