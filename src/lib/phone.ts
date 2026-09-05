/** Digits-only Indian mobile (last 10). */
export function indianMobileDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/** Store as +91XXXXXXXXXX when 10 digits are present. */
export function toIndiaPhoneE164(digits: string): string | null {
  const d = indianMobileDigits(digits);
  if (d.length !== 10) return null;
  return `+91${d}`;
}

/** Display digits from stored +91… / 91… / raw value. */
export function fromStoredIndiaPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return indianMobileDigits(phone);
}

export function normalizeIndiaPhoneInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+91")) return toIndiaPhoneE164(trimmed.slice(3));
  if (trimmed.startsWith("91") && trimmed.length >= 12) {
    return toIndiaPhoneE164(trimmed.slice(2));
  }
  return toIndiaPhoneE164(trimmed);
}
