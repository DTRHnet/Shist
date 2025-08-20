import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { initializeLocalDatabase } from './initLocalDb';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use regular PostgreSQL connection for local development
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local PostgreSQL
});

export const db = drizzle(pool, { schema });

// Initialize database on import
initializeLocalDatabase().catch(console.error);