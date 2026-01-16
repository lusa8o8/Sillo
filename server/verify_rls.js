
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

const { Pool } = pg;
const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Failed to connect:", err.message);
        process.exit(1);
    }

    // Try a simple query on the users table (if empty, it still works)
    client.query('SELECT count(*) FROM users', (err, res) => {
        release();
        pool.end();

        if (err) {
            console.error("❌ Failed to query users table (RLS check failed?):", err.message);
            process.exit(1);
        }

        console.log("✅ Successfully verified database connectivity and admin access.");
        process.exit(0);
    });
});
