# Cable Rates API

Production-ready Node.js backend that reads daily cable prices from a private Google Sheet and exposes secure REST APIs for mobile and web clients.

Google Sheets is the **master data source**. The API caches sheet data (default TTL: 5 minutes) so Google is not called on every request.

---

## Tech Stack

- Node.js (LTS ≥ 20)
- Express.js
- googleapis (Service Account auth)
- axios (Sheets HTTP reads)
- dotenv, helmet, cors, compression, morgan
- express-rate-limit, node-cache
- zod, winston

---

## Architecture

Clean Architecture + Repository Pattern:

```
src/
  config/         Environment, CORS, rate limit, Google config
  controllers/    HTTP adapters
  services/       Business use cases
  repositories/   Data access (Google Sheets + cache)
  routes/         Route definitions
  middlewares/    Errors, validation, request logging
  validators/     Zod schemas
  utils/          Auth, sheet mapping, logger, responses
  constants/      Messages, status codes, cache keys
  types/          JSDoc domain types
  interfaces/     Repository contracts
  cache/          Cache manager (node-cache)
  logs/           info.log / error.log
  app.js          Express app factory
  server.js       Process bootstrap & graceful shutdown
```

Layers depend inward only:

`routes → controllers → services → repositories → Google Sheets / cache`

---

## Installation

```bash
cd "c:\Users\pc\Desktop\price sheet"
npm install
```

Copy environment template:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

---

## Google Cloud Configuration

### 1. Create a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project

### 2. Enable Google Sheets API

1. Go to **APIs & Services → Library**
2. Search for **Google Sheets API**
3. Click **Enable**

### 3. Create a Service Account

1. Go to **APIs & Services → Credentials**
2. **Create Credentials → Service account**
3. Name it (e.g. `cable-rates-reader`)
4. Skip optional role bindings (sheet sharing is enough for read access)
5. Open the service account → **Keys → Add key → Create new key → JSON**
6. Download the JSON file

### 4. Place the Service Account JSON

Put the downloaded file here (exact path expected by default `.env`):

```
c:\Users\pc\Desktop\price sheet\credentials\service-account.json
```

Rename the file to `service-account.json` if Google gave it a long default name.

**Never commit this file.** It is gitignored.

### 5. Share the Google Sheet

1. Open your Google Sheet (master workbook)
2. Confirm a tab named exactly: **`Daily Rates`**
3. Click **Share**
4. Paste the service account email from the JSON (`client_email`, looks like `...@....iam.gserviceaccount.com`)
5. Grant **Viewer** access
6. Uncheck “Notify people” and share

The sheet must **not** be public. Private + shared with the service account is correct.

### 6. Sheet structure (live workbook)

Header is typically on **row 3**. API reads:

| B NAME OF CABLE | G P=10% | H P=15% | I P=20% |
|-----------------|---------|---------|---------|
| CAT6 UTP 23 AWG | 32378.65 | 33850.40 | 35322.16 |

- Columns A–I are read; empty / title rows above the header are ignored
- Header row is detected automatically (`NAME OF CABLE`, `P=10%`, …)
- Prices are parsed as numbers
- Tab name defaults to `Daily Rates` (override with `GOOGLE_SHEET_NAME`); otherwise auto-detected

### 7. Copy the Spreadsheet ID

From the sheet URL:

```
https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit
```

---

## Environment Variables

Edit `.env`:

```env
PORT=3000
GOOGLE_SHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=Daily Rates
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=./credentials/service-account.json
CACHE_TTL=300
NODE_ENV=development
CORS_ORIGIN=*
```

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `3000`) |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from the URL |
| `GOOGLE_SHEET_NAME` | Tab name (default `Daily Rates`; auto-detects if missing) |
| `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` | Path to service account JSON |
| `CACHE_TTL` | Cache lifetime in seconds (default `300` = 5 min) |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | `*` or comma-separated origins |
| `GOOGLE_SHEETS_TIMEOUT_MS` | Outbound Sheets timeout |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window |
| `RATE_LIMIT_MAX` | Max requests per window |
| `LOG_LEVEL` | Winston level |

---

## How to Run

Development (auto-restart on file changes):

```bash
npm run dev
```

Production:

```bash
npm start
```

Lint:

```bash
npm run lint
```

- **Web UI:** `http://localhost:3000`
- **API:** `http://localhost:3000/api/v1/rates`

The frontend shows **NAME OF CABLE**, **P=10%**, **P=15%**, **P=20%** (Rate / Kg).  
Use **Sync Sheet** (or wait ~60s auto-sync) after editing Google Sheets.

---

## API Documentation

Base URL: `/api/v1`

### Success envelope

```json
{
  "success": true,
  "message": "Rates fetched successfully",
  "data": []
}
```

### Error envelope

```json
{
  "success": false,
  "message": "Error message"
}
```

---

### `GET /api/v1/health`

Liveness + last cache refresh metadata.

**Response**

```json
{
  "status": "ok",
  "lastRefreshTime": "2026-08-07T06:00:00.000Z",
  "environment": "development",
  "uptime": 120
}
```

`lastRefreshTime` is `null` until the first successful sheet fetch.

---

### `GET /api/v1/rates`

Returns all cable rates (from cache when warm).

**Response**

```json
{
  "success": true,
  "message": "Rates fetched successfully",
  "data": [
    {
      "sNo": 1,
      "name": "CAT6 UTP 23 AWG",
      "p10": 32378.65136,
      "p15": 33850.40824,
      "p20": 35322.16512
    }
  ]
}
```

---

### `GET /api/v1/rates/:identifier`

Returns a single cable by **S NO** or exact **cable name** (case-insensitive).

**Examples:**
- `GET /api/v1/rates/1`
- `GET /api/v1/rates/CAT6%20UTP%2023%20AWG`

**404** when not found.

---

### `POST /api/v1/cache/refresh`

Manually clears the cache and reloads from Google Sheets.

**Response**

```json
{
  "success": true,
  "message": "Cache refreshed successfully",
  "data": {
    "count": 12,
    "lastRefreshTime": "2026-08-07T06:05:00.000Z"
  }
}
```

---

## Caching

- In-memory cache via `node-cache`
- Default TTL: **300 seconds (5 minutes)**
- After expiry, the next request refreshes from Google Sheets
- Concurrent cache misses share one in-flight Google request
- Manual refresh: `POST /api/v1/cache/refresh`

---

## Error Handling

Centralized middleware covers:

| Scenario | Code / behavior |
|----------|-----------------|
| Missing sheet tab | `MISSING_SHEET` |
| Missing / invalid credentials | `MISSING_CREDENTIALS` |
| Google API failure | `GOOGLE_API_FAILURE` |
| Invalid spreadsheet | `INVALID_SHEET` |
| Invalid columns | `INVALID_COLUMNS` |
| Rate parse failure | `RATE_PARSING_ERROR` |
| Network failure | `NETWORK_FAILURE` |
| Timeout | `TIMEOUT` |
| Empty data | `EMPTY_DATA` |

---

## Security

- Helmet headers
- CORS configuration
- Compression
- Rate limiting
- Secrets only via environment / local credential file
- Service account JSON never exposed via API
- No public Google Sheet required

---

## Logging

Winston writes to:

- `src/logs/info.log`
- `src/logs/error.log`

Console logging is enabled in development.

---

## Deployment

### Checklist

1. Set `NODE_ENV=production`
2. Set `GOOGLE_SHEET_ID` and mount/provide the service account JSON
3. Set `CORS_ORIGIN` to your web/app origins (not `*` if credentials are needed)
4. Use a process manager (PM2, systemd) or a container platform
5. Ensure the host can reach `sheets.googleapis.com`
6. Prefer a single instance for in-memory cache consistency, or move cache to Redis later

### Example (PM2)

```bash
npm install -g pm2
pm2 start src/server.js --name cable-rates-api
pm2 save
```

### Example (Docker sketch)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
```

Mount credentials securely (secret volume / env file), do not bake JSON into the image.

---

## Future-ready extension points

| Feature | Where to extend |
|---------|-----------------|
| Authentication | `middlewares/` + JWT/session strategy |
| Admin panel / web dashboard | New route modules under `/api/v1/admin` |
| Price history | New repository (DB) + history service |
| Notifications | Event/publisher module triggered on refresh |
| Vendor portal | New bounded context + auth roles |
| Product catalogue | Parallel repository/service/controller set |

The current rate domain is isolated behind `IRateRepository` / `RateService`, so new modules can be added without rewriting the Sheets reader.

---

## Folder explanation (quick)

| Path | Role |
|------|------|
| `credentials/` | Local service account JSON (gitignored) |
| `src/config` | Validated configuration |
| `src/repositories` | Sheets + cached rate access |
| `src/services` | Use cases |
| `src/controllers` | Request/response mapping |
| `src/cache` | TTL cache manager |
| `src/middlewares` | Cross-cutting concerns |

---

## License

Private / UNLICENSED
