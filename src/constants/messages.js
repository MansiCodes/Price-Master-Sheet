/**
 * Centralized user-facing and log messages.
 */
export const Messages = Object.freeze({
  RATES_FETCHED: 'Rates fetched successfully',
  RATE_FETCHED: 'Rate fetched successfully',
  RATE_NOT_FOUND: 'Cable rate not found for the given name or serial number',
  CACHE_REFRESHED: 'Cache refreshed successfully',
  HEALTH_OK: 'ok',

  VALIDATION_FAILED: 'Request validation failed',
  ROUTE_NOT_FOUND: 'Route not found',
  INTERNAL_ERROR: 'An unexpected error occurred',

  MISSING_SHEET_ID: 'GOOGLE_SHEET_ID is not configured',
  MISSING_CREDENTIALS: 'Google service account credentials are missing or invalid',
  CREDENTIALS_FILE_NOT_FOUND: 'Service account JSON file was not found at the configured path',
  GOOGLE_API_FAILURE: 'Failed to fetch data from Google Sheets',
  INVALID_SHEET: 'The configured Google Sheet is invalid or inaccessible',
  MISSING_SHEET: 'The configured sheet tab was not found in the workbook',
  INVALID_COLUMNS: 'Sheet columns do not match the expected structure (NAME OF CABLE, P=10%, P=12%, P=15%, P=20%)',
  RATE_PARSING_ERROR: 'One or more price values could not be parsed as numbers',
  NETWORK_FAILURE: 'Network failure while contacting Google Sheets',
  TIMEOUT: 'Google Sheets request timed out',
  EMPTY_DATA: 'No cable rate data found in the sheet',
});
