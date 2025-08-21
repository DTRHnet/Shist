import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from "@shared/schema";

export async function initializeLocalDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for local development");
  }

  try {
    // Test database connection
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    const db = drizzle(pool, { schema });

    // Test connection
    await pool.query('SELECT 1');
    console.log("Local database connection successful");

    // Create tables using raw SQL since we don't have migration files
    await createTables(pool);
    
    await pool.end();
    
    return db;
  } catch (error) {
    console.error("Failed to initialize local database:", error);
    throw error;
  }
}

async function createTables(pool: Pool) {
  const client = await pool.connect();
  
  try {
    // Create sessions table for authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(requester_id, addressee_id)
      );
    `);

    // Create lists table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lists (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        description TEXT,
        creator_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create list_participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS list_participants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id VARCHAR NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR NOT NULL DEFAULT 'member',
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(list_id, user_id)
      );
    `);

    // Create list_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS list_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id VARCHAR NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        text VARCHAR NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        added_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Local database tables created successfully");
  } finally {
    client.release();
  }
}