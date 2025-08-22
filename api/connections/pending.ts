import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, or } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../schema";

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

async function getUser(id: string) {
  const database = await getDb();
  const [user] = await database.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

async function getConnections(userId: string) {
  const database = await getDb();
  const connections = await database
    .select()
    .from(schema.connections)
    .where(or(eq(schema.connections.requesterId, userId), eq(schema.connections.addresseeId, userId)));
  
  // Get connections with user data
  const connectionsWithUsers = await Promise.all(
    connections.map(async (connection) => {
      const [requester] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, connection.requesterId));
      
      const [addressee] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, connection.addresseeId));
      
      return {
        ...connection,
        requester,
        addressee,
      };
    })
  );
  
  return connectionsWithUsers;
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
    throw new Error('Failed to initialize default user');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    if (req.method === 'GET') {
      const defaultUserId = await ensureDefaultUser();
      const allConnections = await getConnections(defaultUserId);
      
      // Filter for pending connections where the current user is the addressee
      const pendingConnections = allConnections.filter((connection: any) => 
        connection.status === 'pending' && connection.addresseeId === defaultUserId
      );
      
      return res.status(200).json(pendingConnections);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in pending connections API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
