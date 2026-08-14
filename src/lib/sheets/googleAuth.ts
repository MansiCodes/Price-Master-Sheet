import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SheetsError, type ServiceAccountCredentials } from "./types";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

const TOKEN_URI = "https://oauth2.googleapis.com/token";

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;
let cachedCredentials: ServiceAccountCredentials | null = null;

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function parseCredentials(raw: string): ServiceAccountCredentials {
  let credentials: ServiceAccountCredentials;
  try {
    credentials = JSON.parse(raw) as ServiceAccountCredentials;
  } catch {
    throw new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }

  if (typeof credentials.private_key === "string") {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  return credentials;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveCredentialsPath(configured: string): Promise<string> {
  if (path.isAbsolute(configured)) {
    return configured;
  }

  const candidates = [
    path.resolve(process.cwd(), configured),
    path.resolve(process.cwd(), "..", configured),
    path.resolve(process.cwd(), "..", "..", configured),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return candidates[0]!;
}

async function loadCredentials(): Promise<ServiceAccountCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv?.trim()) {
    cachedCredentials = parseCredentials(jsonEnv);
    return cachedCredentials;
  }

  const configuredPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ||
    "./credentials/service-account.json";
  const credentialsPath = await resolveCredentialsPath(configuredPath);

  if (!(await fileExists(credentialsPath))) {
    throw new SheetsError(
      `Service account JSON file was not found at the configured path: ${credentialsPath}`,
      500,
      "MISSING_CREDENTIALS",
    );
  }

  try {
    const raw = await fs.readFile(credentialsPath, "utf8");
    cachedCredentials = parseCredentials(raw);
    return cachedCredentials;
  } catch {
    throw new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }
}

function createSignedJwt(credentials: ServiceAccountCredentials): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: credentials.client_email,
    scope: SCOPES,
    aud: TOKEN_URI,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claimSet));
  const unsigned = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(credentials.private_key);
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

/**
 * Exchanges service-account credentials for a Google OAuth access token.
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const credentials = await loadCredentials();
  const assertion = createSignedJwt(credentials);

  let response: Response;
  try {
    response = await fetch(TOKEN_URI, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
  } catch {
    throw new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }

  if (!response.ok) {
    throw new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new SheetsError(
      "Google service account credentials are missing or invalid",
      500,
      "MISSING_CREDENTIALS",
    );
  }

  const expiresIn = Number(data.expires_in) || 3600;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return cachedToken.accessToken;
}

/** @deprecated Prefer getAccessToken — kept for parity with Express port. */
export async function getGoogleAuthClient(): Promise<{
  getAccessToken: () => Promise<string>;
}> {
  return {
    getAccessToken: async () => getAccessToken(),
  };
}

export function resetGoogleAuthClient(): void {
  cachedToken = null;
  cachedCredentials = null;
}
