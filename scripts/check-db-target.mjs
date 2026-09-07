/**
 * Prints which database host your local app is using (no password).
 * Compare this to Amplify → Environment variables → DATABASE_URL host.
 *
 *   node scripts/check-db-target.mjs
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function loadEnvFile(file) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] == null) process.env[m[1]] = v;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const raw = (process.env.DATABASE_URL || "").trim();
if (!raw) {
  console.error("DATABASE_URL is not set in .env / .env.local");
  process.exit(1);
}

try {
  const u = new URL(raw);
  console.log("Local app database target:");
  console.log(`  host: ${u.hostname}`);
  console.log(`  db:   ${u.pathname.replace(/^\//, "") || "(default)"}`);
  console.log("");
  console.log(
    "For local and AWS to show the SAME data, this host must match",
  );
  console.log(
    "Amplify Console → App → Environment variables → DATABASE_URL host.",
  );
  console.log(
    "Copy that full DATABASE_URL into your local .env, then restart npm run dev.",
  );
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}
