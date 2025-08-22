import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ensureDbInitialized } from './shared/db-init';

neonConfig.webSocketConstructor = ws;

// Inline schema definitions
const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
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
    await ensureDbInitialized(pool);
    db = drizzle({ client: pool, schema });
  }
  return db;
}

async function getUser(id: string) {
  const database = await getDb();
  const [user] = await database.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

async function getAllUsers() {
  const database = await getDb();
  const users = await database.select().from(schema.users).orderBy(schema.users.createdAt);
  return users;
}

async function updateUserRole(userId: string, newRole: string) {
  const database = await getDb();
  const [user] = await database
    .update(schema.users)
    .set({ 
      role: newRole,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, userId))
    .returning();
  return user;
}

async function updateUserStatus(userId: string, isActive: boolean) {
  const database = await getDb();
  const [user] = await database
    .update(schema.users)
    .set({ 
      isActive: isActive,
      updatedAt: new Date()
    })
    .where(eq(schema.users.id, userId))
    .returning();
  return user;
}

// Role hierarchy for permission checking
const roleHierarchy = {
  'guest': 0,
  'user': 1,
  'pro': 2,
  'mod': 3,
  'god': 4
};

function hasPermission(userRole: string, requiredRole: string): boolean {
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy];
}

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'kbs-user-id';
    const defaultUser = await getUser(defaultUserId);
    
    if (!defaultUser) {
      throw new Error('Default user not found');
    }
    
    return defaultUserId;
  } catch (error) {
    console.error('Error ensuring default user:', error);
    throw new Error('Failed to initialize default user');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Users API - Method:', req.method, 'URL:', req.url, 'Body:', req.body);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    const defaultUserId = await ensureDefaultUser();
    const currentUser = await getUser(defaultUserId);

    if (req.method === 'GET') {
      console.log('Getting users...');
      
      // Only mod and god can view all users
      if (!hasPermission(currentUser.role, 'mod')) {
        return res.status(403).json({ message: 'Insufficient permissions to view users' });
      }

      const users = await getAllUsers();
      return res.status(200).json(users);
    }
    
    if (req.method === 'PATCH') {
      console.log('Updating user with body:', req.body);
      
      const { userId, role, isActive } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Only god can modify user roles
      if (role && !hasPermission(currentUser.role, 'god')) {
        return res.status(403).json({ message: 'Insufficient permissions to modify user roles' });
      }

      // Mod and god can modify user status
      if (typeof isActive === 'boolean' && !hasPermission(currentUser.role, 'mod')) {
        return res.status(403).json({ message: 'Insufficient permissions to modify user status' });
      }

      let updatedUser = null;

      if (role) {
        // Validate role
        if (!Object.keys(roleHierarchy).includes(role)) {
          return res.status(400).json({ message: 'Invalid role' });
        }
        updatedUser = await updateUserRole(userId, role);
      }

      if (typeof isActive === 'boolean') {
        updatedUser = await updateUserStatus(userId, isActive);
      }

      return res.status(200).json(updatedUser);
    }
    
    return res.status(405).json({ message: 'Method not allowed for users' });
  } catch (error) {
    console.error('Error in users API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
