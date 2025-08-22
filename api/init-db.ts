import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, jsonb, uuid, index, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

// Complete schema definitions
const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  icon: varchar("icon").notNull(),
  parentId: uuid("parent_id").references((): any => categories.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const lists = pgTable("lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: varchar("description"),
  isPublic: boolean("is_public").default(false),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const listParticipants = pgTable("list_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => lists.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  canAdd: boolean("can_add").default(true),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const listItems = pgTable("list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull().references(() => lists.id),
  content: varchar("content").notNull(),
  note: varchar("note"),
  url: varchar("url"),
  categoryId: varchar("category_id"),
  addedById: varchar("added_by_id").notNull().references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  addresseeId: varchar("addressee_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").unique().notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientEmail: varchar("recipient_email").notNull(),
  status: varchar("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const schema = { users, categories, lists, listParticipants, listItems, connections, invitations };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.',
        error: 'DATABASE_URL missing'
      });
    }

    if (req.method === 'POST' || req.method === 'GET') {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle({ client: pool, schema });

      try {
        // Test database connection
        await pool.query('SELECT 1');
        
        // Create tables using Drizzle's migrate function
        try {
          // Create users table first (no dependencies)
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

          // Create categories table without the self-reference first
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

          // Add the self-referencing foreign key constraint after the table exists
          try {
            await pool.query(`
              ALTER TABLE categories 
              ADD CONSTRAINT categories_parent_id_fkey 
              FOREIGN KEY (parent_id) REFERENCES categories(id);
            `);
          } catch (constraintError) {
            // Constraint might already exist, ignore the error
            console.log('Foreign key constraint may already exist:', constraintError);
          }

          // Create lists table
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

          // Create list_participants table
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

          // Create list_items table
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

          // Create connections table
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

          // Create invitations table
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

          // Try to create a test user
          const testUser = {
            id: 'kbs-user-id',
            email: 'kbs.bradley88@gmail.com',
            firstName: 'KBS',
            lastName: 'Bradley',
            role: 'god', // Give admin privileges for testing
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          try {
            const [user] = await db
              .insert(schema.users)
              .values(testUser)
              .onConflictDoUpdate({
                target: schema.users.id,
                set: testUser,
              })
              .returning();

            return res.status(200).json({ 
              message: 'Database initialized successfully',
              user,
              status: 'connected_and_tables_created'
            });
          } catch (userError) {
            return res.status(500).json({ 
              message: 'Tables created but user creation failed',
              error: userError instanceof Error ? userError.message : 'User creation error',
              status: 'tables_created_user_failed'
            });
          }
        } catch (tableError) {
          return res.status(500).json({ 
            message: 'Database connected but table creation failed',
            error: tableError instanceof Error ? tableError.message : 'Table creation error',
            status: 'connected_table_creation_failed'
          });
        }
      } catch (connectionError) {
        return res.status(500).json({ 
          message: 'Database connection failed',
          error: connectionError instanceof Error ? connectionError.message : 'Connection error',
          status: 'connection_failed'
        });
      } finally {
        await pool.end();
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in init-db API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
