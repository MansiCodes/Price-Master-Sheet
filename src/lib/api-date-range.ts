import { dateOnlyRegex, parseDateOnly } from "@/lib/dates";

type DateFilter =
  | { date: Date }
  | { date: { gte?: Date; lte?: Date } }
  | Record<string, never>;

function cleanDateParam(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

/** Build a Prisma date filter from `date`, or `from`/`to` query params. */
export function dateRangeFromSearchParams(sp: URLSearchParams): {
  filter: DateFilter;
  error: string | null;
} {
  const dateStr = cleanDateParam(sp.get("date"));
  const fromStr = cleanDateParam(sp.get("from"));
  const toStr = cleanDateParam(sp.get("to"));

  if (dateStr) {
    if (!dateOnlyRegex.test(dateStr)) {
      return { filter: {}, error: "Invalid date" };
    }
    return { filter: { date: parseDateOnly(dateStr) }, error: null };
  }

  if (!fromStr && !toStr) {
    return { filter: {}, error: null };
  }

  if (
    (fromStr && !dateOnlyRegex.test(fromStr)) ||
    (toStr && !dateOnlyRegex.test(toStr))
  ) {
    return { filter: {}, error: "Invalid from/to date" };
  }

  // Only FROM → from that day onward
  if (fromStr && !toStr) {
    return { filter: { date: { gte: parseDateOnly(fromStr) } }, error: null };
  }

  // Only TO → up to that day
  if (!fromStr && toStr) {
    return { filter: { date: { lte: parseDateOnly(toStr) } }, error: null };
  }

  // Both set → inclusive range (swap if user picks them reversed)
  const from = parseDateOnly(fromStr!);
  const to = parseDateOnly(toStr!);
  if (from.getTime() > to.getTime()) {
    return { filter: { date: { gte: to, lte: from } }, error: null };
  }
  return { filter: { date: { gte: from, lte: to } }, error: null };
}
