"use client";

import { useTranslations } from "next-intl";

type BillPhotosCellProps = {
  urls?: string[] | null;
  fallbackUrl?: string | null;
};

export function BillPhotosCell({ urls, fallbackUrl }: BillPhotosCellProps) {
  const t = useTranslations("pnl");
  const photos = Array.from(
    new Set([...(urls ?? []), ...(fallbackUrl ? [fallbackUrl] : [])].filter(Boolean)),
  ).slice(0, 3);

  if (photos.length === 0) {
    return <span className="pnl-no-bill-photo">{t("noUploadedImage")}</span>;
  }

  const encodedUrls = encodeURIComponent(JSON.stringify(photos));

  return (
    <div className="pnl-bill-photos">
      {photos.map((url, index) => {
        const viewerUrl = `/image-viewer?index=${index}&urls=${encodedUrls}`;
        return (
          <a
            key={url}
            className="pnl-bill-photo"
            href={viewerUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open bill photo ${index + 1}`}
            title={`Open bill photo ${index + 1}`}
            style={{ backgroundImage: `url("${url.replaceAll('"', "%22")}")` }}
          >
            <span>{index + 1}</span>
          </a>
        );
      })}
    </div>
  );
}
