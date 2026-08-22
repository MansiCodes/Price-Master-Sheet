const { Client } = require('pg');
require('dotenv').config();

async function checkDb() {
  const dbUrl = process.env.DATABASE_URL.split('?')[0];
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to RDS database.");

    const usersRes = await client.query('SELECT id, email, phone, "passwordHash", "isActive", "globalRole" FROM "User"');
    console.log("Registered Users in DB:", usersRes.rows);

    const otpRes = await client.query('SELECT id, phone, "codeHash", "expiresAt", consumed, "createdAt" FROM "OtpChallenge" ORDER BY "createdAt" DESC LIMIT 5');
    console.log("Recent OTP Challenges in DB:", otpRes.rows);

  } catch (err) {
    console.error("DB Query Error:", err);
  } finally {
    await client.end();
  }
}

checkDb();
