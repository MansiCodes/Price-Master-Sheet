import { SHEET_NAME } from '../constants/index.js';
import { env } from './env.js';

/**
 * Google Sheets API configuration.
 * Range A:L covers S NO → P=20% for the live workbook layout.
 */
export const googleConfig = Object.freeze({
  sheetId: env.googleSheetId,
  sheetName: env.googleSheetName,
  range: `${env.googleSheetName}!A:L`,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  credentialsPath: env.googleServiceAccountJsonPath,
  credentialsJson: env.googleServiceAccountJson,
  timeoutMs: env.googleSheetsTimeoutMs,
});
