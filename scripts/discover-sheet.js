/**
 * Lists Google Spreadsheets shared with the service account
 * so GOOGLE_SHEET_ID can be filled in .env automatically when possible.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const credentialsPath = path.join(projectRoot, 'credentials', 'service-account.json');

async function main() {
  if (!fs.existsSync(credentialsPath)) {
    console.error('Missing credentials/service-account.json');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  });

  await auth.authorize();
  const drive = google.drive({ version: 'v3', auth });

  const result = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    pageSize: 25,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const files = result.data.files || [];
  if (files.length === 0) {
    console.log('NO_SHEETS_FOUND');
    console.log('Share the Google Sheet with:', credentials.client_email);
    process.exit(2);
  }

  console.log(JSON.stringify(files, null, 2));
}

main().catch((error) => {
  console.error('DISCOVER_FAILED', error?.message || error);
  process.exit(1);
});
