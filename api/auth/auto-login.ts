import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../../shared/schema";

neonConfig.webSocketConstructor = ws;

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
  try {
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
  } catch (error) {
    console.error('Error creating user:', error);
    // If table doesn't exist, create a simple user object
    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

async function getUser(id: string) {
  try {
    const database = await getDb();
    const [user] = await database.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    // If table doesn't exist, return null
    return null;
  }
}

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'default-user-id';
    const defaultUser = await getUser(defaultUserId);
    
    if (!defaultUser) {
      await createUser({
        id: defaultUserId,
        email: 'default@example.com',
        firstName: 'Default',
        lastName: 'User',
      });
    }
    
    return defaultUserId;
  } catch (error) {
    console.error('Error ensuring default user:', error);
    // Return a fallback user ID
    return 'default-user-id';
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.',
        error: 'DATABASE_URL missing'
      });
    }

    if (req.method === 'POST') {
      const defaultUserId = await ensureDefaultUser();
      const user = await getUser(defaultUserId);
      
      if (!user) {
        // Return a fallback user if database is not available
        const fallbackUser = {
          id: defaultUserId,
          email: 'default@example.com',
          firstName: 'Default',
          lastName: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        return res.status(200).json({ 
          user: fallbackUser,
          message: 'Auto-login successful (fallback mode)'
        });
      }

      return res.status(200).json({ 
        user,
        message: 'Auto-login successful'
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in auto-login API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
