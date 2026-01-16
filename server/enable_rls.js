
const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
    }
});

const databaseUrl = envVars.DATABASE_URL;

if (!databaseUrl) {
    console.error("❌ DATABASE_URL is missing from .env file.");
    process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }
});

const query = `
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
`;

console.log("🔒 Enabling Row Level Security on tables...");

pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Failed to connect to the database:", err.message);
        process.exit(1);
    }

    client.query(query, (err, res) => {
        release();
        pool.end();

        if (err) {
            console.error("❌ Failed to enable RLS:", err.message);
            process.exit(1);
        }

        console.log("✅ Successfully enabled RLS on 'users', 'vaults', and 'notes'.");
        process.exit(0);
    });
});
