import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
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

const schema = { users, lists, listItems };

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

async function getListWithDetails(listId: string) {
  const database = await getDb();
  
  // Get the list
  const [list] = await database.select().from(schema.lists).where(eq(schema.lists.id, listId));
  if (!list) return null;
  
  // Get creator
  const [creator] = await database
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, list.creatorId));
  
  // Get items
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
  
  return {
    ...list,
    creator,
    items: itemsWithUsers,
    itemCount: itemsWithUsers.length,
  };
}

function generateHTMLTemplate(list: any) {
  const items = list.items || [];
  const itemsHTML = items.map((item: any) => `
    <div class="item" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: white;">
      <div class="item-content" style="font-size: 16px; font-weight: 500; color: #111827; margin-bottom: 8px;">
        ${item.content}
      </div>
      ${item.note ? `<div class="item-note" style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${item.note}</div>` : ''}
      ${item.url ? `<div class="item-url" style="font-size: 14px;"><a href="${item.url}" target="_blank" style="color: #3b82f6; text-decoration: none;">🔗 ${item.url}</a></div>` : ''}
      <div class="item-meta" style="font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center;">
        <span>Added by ${item.addedBy?.firstName || item.addedBy?.email || 'Unknown'}</span>
        <span>${new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${list.name} - Shist</title>
    <meta property="og:title" content="${list.name} - Shist">
    <meta property="og:description" content="${list.description || `A shared list with ${list.itemCount} items`}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${list.name} - Shist">
    <meta name="twitter:description" content="${list.description || `A shared list with ${list.itemCount} items`}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
            color: #111827;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 32px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header .description {
            margin: 0 0 16px 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .header .meta {
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 24px;
        }
        .section {
            margin-bottom: 24px;
        }
        .section h2 {
            font-size: 18px;
            margin: 0 0 12px 0;
        }
        .items {
            display: grid;
            gap: 12px;
        }
        .footer {
            padding: 16px 24px;
            background: #f3f4f6;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            background: #eef2ff;
            color: #3730a3;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 12px;
          }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${list.name}</h1>
            <div class="description">${list.description || ''}</div>
            <div class="meta">
                <span>${list.itemCount} items</span>
                ${list.creator ? `<span class="badge">Created by ${list.creator.firstName || list.creator.email || 'Unknown'}</span>` : ''}
            </div>
        </div>
        <div class="content">
            <div class="section">
                <h2>Items</h2>
                <div class="items">
                  ${itemsHTML}
                </div>
            </div>
        </div>
        <div class="footer">
            <span>Shared via Shist</span>
            <a href="/" style="color: #3b82f6; text-decoration: none;">Go to app</a>
        </div>
    </div>
</body>
</html>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    const { listId } = req.query as { listId?: string };

    if (!listId) {
      return res.status(400).json({ message: 'List ID is required' });
    }

    if (req.method === 'GET') {
      const list = await getListWithDetails(listId);

      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      // For Vercel, return HTML with appropriate headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(generateHTMLTemplate(list));
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list/[listId] API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
