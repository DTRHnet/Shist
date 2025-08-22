import { Pool } from '@neondatabase/serverless';

let initialized = false;

export async function ensureDbInitialized(pool: Pool): Promise<void> {
  if (initialized) return;

  // Ensure only one initializer runs per cold start
  // If multiple concurrent, let first complete; others will exit quickly
  initialized = true;
  try {
    // Users table and columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'user';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;`);
    await pool.query(`UPDATE users SET role = 'user' WHERE role IS NULL;`);
    await pool.query(`UPDATE users SET is_active = true WHERE is_active IS NULL;`);

    // Categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        icon VARCHAR NOT NULL,
        parent_id VARCHAR,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Add FK only if it doesn't already exist
    const fkCheck = await pool.query(`
      SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_fkey'
    `);
    if (fkCheck.rowCount === 0) {
      await pool.query(`
        ALTER TABLE categories 
        ADD CONSTRAINT categories_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES categories(id);
      `);
    }

    // Lists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lists (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        description VARCHAR,
        is_public BOOLEAN DEFAULT FALSE,
        creator_id VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // List participants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS list_participants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id VARCHAR NOT NULL REFERENCES lists(id),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        can_add BOOLEAN DEFAULT TRUE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // List items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS list_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id VARCHAR NOT NULL REFERENCES lists(id),
        content VARCHAR NOT NULL,
        note VARCHAR,
        url VARCHAR,
        category_id VARCHAR,
        added_by_id VARCHAR NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Connections
    await pool.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id VARCHAR NOT NULL REFERENCES users(id),
        addressee_id VARCHAR NOT NULL REFERENCES users(id),
        status VARCHAR NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Invitations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR UNIQUE NOT NULL,
        sender_id VARCHAR NOT NULL REFERENCES users(id),
        recipient_email VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMP NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

  } catch (error) {
    // If initialization fails, allow request to proceed; downstream handlers will still run
    // Log for diagnostics
    console.error('ensureDbInitialized error:', error);
  }
}
