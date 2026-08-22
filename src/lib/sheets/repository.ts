import { getAccessToken } from "./googleAuth";
import { sheetsCache } from "./cache";
import {
  assertSheetStructure,
  mapSheetRowsToRates,
  type SheetRow,
} from "./sheetReader";
import {
  CACHE_KEYS,
  SheetsError,
  type CableRate,
} from "./types";

const DEFAULT_SHEET_NAME = "Master List";
const DEFAULT_TIMEOUT_MS = 15_000;

type SheetsApiErrorBody = {
  error?: { message?: string };
};

function getSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  if (!sheetId) {
    throw new SheetsError(
      "GOOGLE_SHEET_ID is not configured",
      500,
      "MISSING_SHEET_ID",
    );
  }
  return sheetId;
}

function getConfiguredSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME?.trim() || DEFAULT_SHEET_NAME;
}

function getTimeoutMs(): number {
  const raw = Number(process.env.GOOGLE_SHEETS_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    if (
      controller.signal.aborted ||
      lower.includes("abort") ||
      lower.includes("timeout")
    ) {
      throw new SheetsError(
        "Google Sheets request timed out",
        504,
        "TIMEOUT",
      );
    }

    throw new SheetsError(
      "Network failure while contacting Google Sheets",
      502,
      "NETWORK_FAILURE",
    );
  } finally {
    clearTimeout(timer);
  }
}

function mapHttpError(status: number, message: string): SheetsError {
  const lower = message.toLowerCase();

  if (status === 404 || lower.includes("requested entity was not found")) {
    return new SheetsError(
      "The configured Google Sheet is invalid or inaccessible",
      404,
      "INVALID_SHEET",
    );
  }

  if (
    lower.includes("unable to parse range") ||
    lower.includes("unable to parse the range") ||
    lower.includes("parse range")
  ) {
    return new SheetsError(
      "The configured sheet tab was not found in the workbook",
      404,
      "MISSING_SHEET",
    );
  }

  if (status === 401 || status === 403) {
    return new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }

  return new SheetsError(
    "Failed to fetch data from Google Sheets",
    502,
    "GOOGLE_API_FAILURE",
  );
}

async function listSheetTitles(sheetId: string): Promise<string[]> {
  const accessToken = await getAccessToken();
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
  );
  url.searchParams.set("fields", "sheets.properties.title");

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    getTimeoutMs(),
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as SheetsApiErrorBody | null;
    throw mapHttpError(
      response.status,
      body?.error?.message || response.statusText,
    );
  }

  const data = (await response.json()) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  return (data.sheets || [])
    .map((sheet) => sheet?.properties?.title)
    .filter((title): title is string => Boolean(title));
}

async function fetchValues(
  sheetId: string,
  range: string,
): Promise<SheetRow[]> {
  const accessToken = await getAccessToken();
  const encodedRange = encodeURIComponent(range);
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`,
  );
  url.searchParams.set("majorDimension", "ROWS");

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    getTimeoutMs(),
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as SheetsApiErrorBody | null;
    throw mapHttpError(
      response.status,
      body?.error?.message || response.statusText,
    );
  }

  const data = (await response.json()) as { values?: SheetRow[] };
  return data.values || [];
}

let resolvedSheetName: string | null = null;

async function resolveSheetName(sheetId: string): Promise<string> {
  if (resolvedSheetName) {
    return resolvedSheetName;
  }

  const configured = getConfiguredSheetName();
  const titles = await listSheetTitles(sheetId);

  if (titles.includes(configured)) {
    resolvedSheetName = configured;
    return configured;
  }

  for (const title of titles) {
    try {
      const rows = await fetchValues(sheetId, `${title}!A1:Z10`);
      const hasHeader = (rows || []).some((row) => {
        const joined = (row || [])
          .map((cell) => String(cell).toLowerCase())
          .join(" ");
        return joined.includes("name of cable") || joined.includes("p=10");
      });
      if (hasHeader) {
        resolvedSheetName = title;
        return title;
      }
    } catch {
      // try next tab
    }
  }

  if (titles.length > 0) {
    resolvedSheetName = titles[0]!;
    return titles[0]!;
  }

  throw new SheetsError(
    "The configured sheet tab was not found in the workbook",
    404,
    "MISSING_SHEET",
  );
}

async function fetchDailyRatesFromSheet(): Promise<CableRate[]> {
  const sheetId = getSheetId();

  try {
    const sheetName = await resolveSheetName(sheetId);
    const rows = await fetchValues(sheetId, `${sheetName}!A:Z`);
    assertSheetStructure(rows);
    return mapSheetRowsToRates(rows);
  } catch (error) {
    if (error instanceof SheetsError) {
      throw error;
    }
    throw new SheetsError(
      "Failed to fetch data from Google Sheets",
      502,
      "GOOGLE_API_FAILURE",
    );
  }
}

let inFlightFetch: Promise<CableRate[]> | null = null;

async function loadAndCache(): Promise<CableRate[]> {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = fetchDailyRatesFromSheet()
    .then((rates) => {
      sheetsCache.set(CACHE_KEYS.DAILY_RATES, rates);
      sheetsCache.set(CACHE_KEYS.LAST_REFRESH_AT, new Date().toISOString(), 0);
      return rates;
    })
    .finally(() => {
      inFlightFetch = null;
    });

  return inFlightFetch;
}

/**
 * Cache-aside repository over Google Sheets Master List rates.
 */
export async function getAllRates(): Promise<CableRate[]> {
  const cached = sheetsCache.get<CableRate[]>(CACHE_KEYS.DAILY_RATES);
  if (cached) {
    return cached;
  }
  return loadAndCache();
}

export async function refreshRatesCache(): Promise<{
  rates: CableRate[];
  lastRefreshTime: string | null;
  count: number;
}> {
  sheetsCache.del(CACHE_KEYS.DAILY_RATES);
  inFlightFetch = null;
  resolvedSheetName = null;

  const rates = await loadAndCache();
  return {
    rates,
    count: rates.length,
    lastRefreshTime:
      sheetsCache.get<string>(CACHE_KEYS.LAST_REFRESH_AT) ?? null,
  };
}

export function getLastRefreshTime(): string | null {
  return sheetsCache.get<string>(CACHE_KEYS.LAST_REFRESH_AT) ?? null;
}
