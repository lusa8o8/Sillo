
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars explicitly in case this is run independently
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verifyConnection() {
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing from environment variables.");
        process.exit(1);
    }

    console.log(`Connecting to: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}...`);

    const sql = postgres(process.env.DATABASE_URL, { prepare: false });

    try {
        const result = await sql`SELECT NOW() as now`;
        console.log("✅ Successfully connected to the database!");
        console.log("📅 Database time:", result[0].now);

        await sql.end();
        process.exit(0);
    } catch (err: any) {
        console.error("❌ Failed to connect to the database:");
        console.error(err.message);
        if (err.code) console.error(`Code: ${err.code}`);
        process.exit(1);
    }
}

verifyConnection();
