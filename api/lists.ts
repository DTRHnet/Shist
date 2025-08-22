import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, or } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, jsonb, uuid, index, boolean } from 'drizzle-orm/pg-core';
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const schema = { users, lists, listParticipants, listItems };

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

async function createList(listData: any) {
  const database = await getDb();
  const [list] = await database.insert(schema.lists).values(listData).returning();
  return list;
}

async function getLists(userId: string) {
  const database = await getDb();
  const lists = await database.select().from(schema.lists);
  
  // For each list, get the related data
  const listsWithDetails = await Promise.all(
    lists.map(async (list: any) => {
      // Get creator
      const [creator] = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, list.creatorId));
      
      // Get participants
      const participants = await database
        .select()
        .from(schema.listParticipants)
        .where(eq(schema.listParticipants.listId, list.id));
      
      // Get participants with user data
      const participantsWithUsers = await Promise.all(
        participants.map(async (participant: any) => {
          const [user] = await database
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, participant.userId));
          return { ...participant, user };
        })
      );
      
      // Get items
      const items = await database
        .select()
        .from(schema.listItems)
        .where(eq(schema.listItems.listId, list.id))
        .orderBy(schema.listItems.createdAt);
      
      // Get items with user data
      const itemsWithUsers = await Promise.all(
        items.map(async (item: any) => {
          const [addedBy] = await database
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, item.addedById));
          return { ...item, addedBy };
        })
      );
      
      // Get last item
      const lastItem = itemsWithUsers.length > 0 ? itemsWithUsers[itemsWithUsers.length - 1] : undefined;
      
      return {
        ...list,
        creator,
        participants: participantsWithUsers,
        items: itemsWithUsers,
        itemCount: itemsWithUsers.length,
        lastItem,
      };
    })
  );
  
  return listsWithDetails;
}

async function addListParticipant(participantData: any) {
  const database = await getDb();
  const [participant] = await database.insert(schema.listParticipants).values(participantData).returning();
  return participant;
}

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'kbs-user-id';
    const defaultUser = await getUser(defaultUserId);
    
    if (!defaultUser) {
      await createUser({
        id: defaultUserId,
        email: 'kbs.bradley88@gmail.com',
        firstName: 'KBS',
        lastName: 'Bradley',
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
    console.log('Lists API - Method:', req.method, 'URL:', req.url, 'Body:', req.body);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    if (req.method === 'GET') {
      console.log('Getting lists...');
      const defaultUserId = await ensureDefaultUser();
      const lists = await getLists(defaultUserId);
      return res.status(200).json(lists);
    }
    
    if (req.method === 'POST') {
      console.log('Creating list with body:', req.body);
      const defaultUserId = await ensureDefaultUser();
      
      const list = await createList({
        name: req.body.name || 'New List',
        description: req.body.description || '',
        isPublic: req.body.isPublic || false,
        creatorId: defaultUserId,
      });

      // Add creator as participant with full permissions
      await addListParticipant({
        listId: list.id,
        userId: defaultUserId,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      });

      return res.status(201).json(list);
    }
    
    return res.status(405).json({ message: 'Method not allowed for /lists' });
  } catch (error) {
    console.error('Error in lists API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
