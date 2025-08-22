import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and } from 'drizzle-orm';
import ws from "ws";
import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ensureDbInitialized } from '../shared/db-init';

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

async function getUser(id: string) {
  const database = await getDb();
  const [user] = await database.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

async function getList(listId: string) {
  const database = await getDb();
  const [list] = await database.select().from(schema.lists).where(eq(schema.lists.id, listId));
  return list;
}

async function getListParticipant(listId: string, userId: string) {
  const database = await getDb();
  const [participant] = await database
    .select()
    .from(schema.listParticipants)
    .where(and(
      eq(schema.listParticipants.listId, listId),
      eq(schema.listParticipants.userId, userId)
    ));
  return participant;
}

async function createListItem(itemData: any) {
  const database = await getDb();
  const [item] = await database.insert(schema.listItems).values(itemData).returning();
  return item;
}

async function getListItems(listId: string) {
  const database = await getDb();
  const items = await database
    .select()
    .from(schema.listItems)
    .where(eq(schema.listItems.listId, listId))
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
  
  return itemsWithUsers;
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
    const { listId } = req.query;
    console.log('List Items API - Method:', req.method, 'ListId:', listId, 'Body:', req.body);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    if (!listId || typeof listId !== 'string') {
      return res.status(400).json({ message: 'List ID is required' });
    }

    const defaultUserId = await ensureDefaultUser();

    if (req.method === 'GET') {
      console.log('Getting items for list:', listId);
      const items = await getListItems(listId);
      return res.status(200).json(items);
    }
    
    if (req.method === 'POST') {
      console.log('Adding item to list:', listId, 'Body:', req.body);
      
      // Check if list exists
      const list = await getList(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      // Check if user has permission to add items
      const participant = await getListParticipant(listId, defaultUserId);
      if (!participant && list.creatorId !== defaultUserId) {
        return res.status(403).json({ message: 'No permission to add items to this list' });
      }

      const item = await createListItem({
        listId: listId,
        content: req.body.content || '',
        note: req.body.note || null,
        url: req.body.url || null,
        categoryId: req.body.categoryId || null,
        addedById: defaultUserId,
      });

      return res.status(201).json(item);
    }
    
    return res.status(405).json({ message: 'Method not allowed for list items' });
  } catch (error) {
    console.error('Error in list items API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
