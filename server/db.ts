import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../shared/schema";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is missing from environment variables. Database features will fail.");
}

const dbUrl = process.env.DATABASE_URL || "postgres://localhost:5432/postgres";
const client = postgres(dbUrl, { prepare: false });
export const db = drizzle(client, { schema });
