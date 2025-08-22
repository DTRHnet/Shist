import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

// Inline schema definitions
const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const schema = { users };

let db: any;

async function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  }
  return db;
}

async function createUser(userData: any) {
  const database = await getDb();
  const [user] = await database
    .insert(schema.users)
    .values(userData)
    .onConflictDoUpdate({
      target: schema.users.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    if (req.method === 'POST') {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Create or get user based on email
      const [firstName, lastName] = (name || 'Local User').split(' ');
      
      const user = await createUser({
        id: email, // Use email as user ID for simplicity
        email,
        firstName,
        lastName: lastName || '',
      });

      return res.status(200).json({ 
        user,
        message: 'Login successful'
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in local-auth API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
