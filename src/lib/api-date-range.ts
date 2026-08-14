import { dateOnlyRegex, parseDateOnly } from "@/lib/dates";

type DateFilter =
  | { date: Date }
  | { date: { gte: Date; lte: Date } }
  | Record<string, never>;

/** Build a Prisma date filter from `date`, or `from`/`to` query params. */
export function dateRangeFromSearchParams(sp: URLSearchParams): {
  filter: DateFilter;
  error: string | null;
} {
  const dateStr = sp.get("date");
  const fromStr = sp.get("from");
  const toStr = sp.get("to");

  if (dateStr) {
    if (!dateOnlyRegex.test(dateStr)) {
      return { filter: {}, error: "Invalid date" };
    }
    return { filter: { date: parseDateOnly(dateStr) }, error: null };
  }

  if (fromStr || toStr) {
    if (
      (fromStr && !dateOnlyRegex.test(fromStr)) ||
      (toStr && !dateOnlyRegex.test(toStr))
    ) {
      return { filter: {}, error: "Invalid from/to date" };
    }
    const from = parseDateOnly(fromStr ?? toStr!);
    const to = parseDateOnly(toStr ?? fromStr!);
    return { filter: { date: { gte: from, lte: to } }, error: null };
  }

  return { filter: {}, error: null };
}
