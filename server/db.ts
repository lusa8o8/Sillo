import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is missing from environment variables. Database features will fail.");
}

const dbUrl = process.env.DATABASE_URL || "postgres://localhost:5432/postgres";
// Supabase's pooler presents a cert chain that some runtimes (e.g. Vercel) won't
// verify, causing "self-signed certificate in certificate chain". Encrypt the
// connection but skip CA verification. For stricter security, pin Supabase's CA
// cert via ssl: { ca: <cert> } instead.
const client = postgres(dbUrl, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
});
export const db = drizzle(client, { schema });
