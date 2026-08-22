const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');
require('dotenv').config();

function formatValue(val) {
  if (val === '\\N' || val === undefined || val === null) {
    return 'NULL';
  }
  if (val === 't') return 'TRUE';
  if (val === 'f') return 'FALSE';
  // Escape single quotes in string
  const escaped = val.replace(/'/g, "''");
  return `'${escaped}'`;
}

async function restore() {
  let dbUrl = process.env.DATABASE_URL.split('?')[0];
  console.log("Connecting to RDS PostgreSQL database...");
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to AWS RDS!");

    const sqlPath = path.join(__dirname, '..', 'backups', 'plant_pnl_backup_2026-08-20_173443.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error("Backup file not found at:", sqlPath);
      process.exit(1);
    }

    console.log("Parsing & restoring backup file to AWS RDS...");
    
    const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentCopyHeader = null;
    let currentCopyRows = [];
    let currentSqlBuffer = '';
    let restoredStatements = 0;
    let restoredRows = 0;

    for await (const line of rl) {
      const trimmed = line.trim();

      // Skip psql metacommands starting with backslash except \.
      if (line.startsWith('\\') && !line.startsWith('\\.')) {
        continue;
      }

      // If we are currently inside a COPY block
      if (currentCopyHeader) {
        if (line.startsWith('\\.')) {
          // End of COPY block -> insert rows
          if (currentCopyRows.length > 0) {
            console.log(`Restoring ${currentCopyRows.length} rows for ${currentCopyHeader.table}...`);
            // Execute inserts in batches of 200
            const batchSize = 200;
            for (let i = 0; i < currentCopyRows.length; i += batchSize) {
              const batch = currentCopyRows.slice(i, i + batchSize);
              const valueTuples = batch.map(row => {
                const values = row.split('\t').map(formatValue);
                return `(${values.join(', ')})`;
              });
              const insertQuery = `INSERT INTO ${currentCopyHeader.table} (${currentCopyHeader.cols}) VALUES ${valueTuples.join(',\n')};`;
              await client.query(insertQuery);
              restoredRows += batch.length;
            }
          }
          currentCopyHeader = null;
          currentCopyRows = [];
        } else {
          if (trimmed.length > 0) {
            currentCopyRows.push(line);
          }
        }
        continue;
      }

      // Check if line is start of COPY block
      if (line.startsWith('COPY ')) {
        // Execute any pending SQL before starting COPY
        if (currentSqlBuffer.trim().length > 0) {
          try {
            await client.query(currentSqlBuffer);
            restoredStatements++;
          } catch (e) {
            // Ignore benign DDL errors like IF EXISTS
          }
          currentSqlBuffer = '';
        }

        const match = line.match(/^COPY\s+([^\s]+)\s*\((.+)\)\s+FROM\s+stdin;/i);
        if (match) {
          currentCopyHeader = {
            table: match[1],
            cols: match[2]
          };
          currentCopyRows = [];
        }
        continue;
      }

      // Standard SQL statement buffer
      currentSqlBuffer += line + '\n';
      if (trimmed.endsWith(';')) {
        const queryToRun = currentSqlBuffer.trim();
        currentSqlBuffer = '';
        if (queryToRun.length > 0) {
          try {
            await client.query(queryToRun);
            restoredStatements++;
          } catch (e) {
            // ignore non-critical DDL errors during restore
            if (!e.message.includes('does not exist')) {
              // console.warn("Statement warning:", e.message);
            }
          }
        }
      }
    }

    // Execute remaining SQL buffer
    if (currentSqlBuffer.trim().length > 0) {
      try {
        await client.query(currentSqlBuffer.trim());
      } catch (e) {}
    }

    console.log("=========================================");
    console.log(`SUCCESS! Restored ${restoredStatements} SQL DDL statements and ${restoredRows} data rows into AWS RDS!`);
    console.log("=========================================");

  } catch (err) {
    console.error("Restore failed:", err.message || err);
  } finally {
    await client.end();
  }
}

restore();
