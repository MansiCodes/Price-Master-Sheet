const { Client } = require('pg');
require('dotenv').config();

async function addSignallingPlant() {
  let dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.toUpperCase().startsWith('DATABASE_URL=')) {
    dbUrl = dbUrl.slice('DATABASE_URL='.length).trim();
  }
  if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
    dbUrl = dbUrl.slice(1, -1).trim();
  }
  dbUrl = dbUrl.split('?')[0];

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Check if plant already exists
    const checkRes = await client.query('SELECT * FROM "Plant" WHERE code = \'SIGNALLING\'');
    let plantId = checkRes.rows[0]?.id;
    if (!plantId) {
      const now = new Date().toISOString();
      const insertRes = await client.query(`
        INSERT INTO "Plant" (id, name, code, "isActive", "unloadingRatePerMT", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'Signalling Plant', 'SIGNALLING', true, 70, $1, $1)
        RETURNING id, name, code
      `, [now]);
      plantId = insertRes.rows[0].id;
    }
    console.log("Signalling plant ID:", plantId);

    // Assign plant roles for Super Admins
    const adminsRes = await client.query('SELECT id FROM "User" WHERE "globalRole" = \'SUPER_ADMIN\' OR "globalRole" = \'BUSINESS_HEAD\'');
    for (const admin of adminsRes.rows) {
      await client.query(`
        INSERT INTO "UserPlantRole" (id, "userId", "plantId", role, "createdAt")
        VALUES (gen_random_uuid()::text, $1, $2, 'SUPER_ADMIN', NOW())
        ON CONFLICT ("userId", "plantId") DO NOTHING
      `, [admin.id, plantId]);
    }
    console.log("Assigned Signalling Plant roles to Super Admins.");

  } catch (err) {
    console.error("Error adding Signalling plant:", err);
  } finally {
    await client.end();
  }
}

addSignallingPlant();
