export function formatDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Clean cached Excel delivery text (e.g. strip "Comm :") and format for display. */
export function formatDeliveryDisplay(raw: string | null | undefined): string {
  if (!raw) return "—";
  const s = raw
    .replace(/^(comm(ercial)?|del(ivery)?(\s*period)?|due)\s*[:\-–]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDisplayDate(s);
  const embedded = s.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/);
  if (embedded) {
    const day = embedded[1].padStart(2, "0");
    const month = embedded[2].padStart(2, "0");
    let year = Number(embedded[3]);
    if (year < 100) year += 2000;
    return `${day}/${month}/${year}`;
  }
  return s;
}

export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}
