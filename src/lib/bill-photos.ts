/** Merge legacy single URL with multi-url array for edit forms. */
export function collectBillPhotoUrls(row: {
  billPhotoUrls?: string[] | null;
  billPhotoUrl?: string | null;
}): string[] {
  const merged = [...(row.billPhotoUrls ?? [])];
  const legacy = row.billPhotoUrl?.trim();
  if (legacy && !merged.includes(legacy)) merged.unshift(legacy);
  return merged;
}

/** Stock entries use photoUrl / photoUrls field names. */
export function collectStockPhotoUrls(row: {
  photoUrls?: string[] | null;
  photoUrl?: string | null;
}): string[] {
  const merged = [...(row.photoUrls ?? [])];
  const legacy = row.photoUrl?.trim();
  if (legacy && !merged.includes(legacy)) merged.unshift(legacy);
  return merged;
}
