import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, or } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, jsonb, uuid, index } from 'drizzle-orm/pg-core';
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

const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  addresseeId: varchar("addressee_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const schema = { users, connections };

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

async function createConnection(connectionData: any) {
  const database = await getDb();
  const [connection] = await database.insert(schema.connections).values(connectionData).returning();
  return connection;
}

async function getConnections(userId: string) {
  const database = await getDb();
  const allConnections = await database
    .select()
    .from(schema.connections);
  
  // Get connections with user data
  const userConnections = allConnections.filter((connection: any) => 
    connection.requesterId === userId || connection.addresseeId === userId
  );
  
  return userConnections;
}

async function updateConnectionStatus(id: string, status: string) {
  const database = await getDb();
  const [connection] = await database
    .update(schema.connections)
    .set({ status, updatedAt: new Date() })
    .where(eq(schema.connections.id, id))
    .returning();
  return connection;
}

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'temp-user-id';
    const defaultUser = await getUser(defaultUserId);
    
    if (!defaultUser) {
      await createUser({
        id: defaultUserId,
        email: 'temp@example.com',
        firstName: 'Temp',
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
    const url = req.url || '';
    const path = url.replace(/^\/api/, '');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Handle /connections/:id/status
    const statusMatch = path.match(/^\/connections\/([^/]+)\/status$/);
    if (statusMatch) {
      const [, connectionId] = statusMatch;
      
      if (req.method === 'PATCH') {
        const connection = await updateConnectionStatus(connectionId, req.body.status);
        return res.status(200).json(connection);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /connections
    if (path === '/connections') {
      if (req.method === 'GET') {
        const defaultUserId = await ensureDefaultUser();
        const connections = await getConnections(defaultUserId);
        return res.status(200).json(connections);
      }
      
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        
        const connection = await createConnection({
          requesterId: defaultUserId,
          addresseeId: req.body.addresseeId,
          status: 'pending',
        });
        return res.status(201).json(connection);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in connections API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
