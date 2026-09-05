/** Browser event to open the dashboard “Add today’s entry” slide-over. */
export const OPEN_TODAY_ENTRY_EVENT = "cj:open-today-entry";

export function requestOpenTodayEntry() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_TODAY_ENTRY_EVENT));
}

export const ENTRY_DATE_STORAGE_KEY = "cj-entry-date";

export function readStoredEntryDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ENTRY_DATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeEntryDate(date: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ENTRY_DATE_STORAGE_KEY, date);
  } catch {
    // ignore
  }
}
