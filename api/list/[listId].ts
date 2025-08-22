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
            opacity: 0.8;
        }
        .content {
            padding: 32px;
        }
        .stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding: 16px;
            background: #f3f4f6;
            border-radius: 8px;
            font-size: 14px;
            color: #6b7280;
        }
        .items-container {
            margin-top: 24px;
        }
        .empty-state {
            text-align: center;
            padding: 48px 24px;
            color: #6b7280;
        }
        .empty-state h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
        }
        .empty-state p {
            margin: 0;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            padding: 24px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #3b82f6;
            text-decoration: none;
        }
        @media (max-width: 640px) {
            body { padding: 12px; }
            .header { padding: 24px; }
            .content { padding: 24px; }
            .header h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${list.name}</h1>
            ${list.description ? `<div class="description">${list.description}</div>` : ''}
            <div class="meta">
                Created by ${list.creator?.firstName || list.creator?.email || 'Unknown'} • 
                ${list.itemCount} items • 
                Updated ${new Date(list.updatedAt).toLocaleDateString()}
            </div>
        </div>
        
        <div class="content">
            <div class="stats">
                <span>📋 ${list.itemCount} items</span>
                <span>👤 ${list.creator?.firstName || list.creator?.email || 'Unknown'}</span>
                <span>📅 ${new Date(list.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div class="items-container">
                ${items.length > 0 ? itemsHTML : `
                    <div class="empty-state">
                        <h3>No items yet</h3>
                        <p>This list is empty. Items will appear here when they're added.</p>
                    </div>
                `}
            </div>
        </div>
        
        <div class="footer">
            <p>Shared via <a href="https://shist.app">Shist</a> • 
            <a href="https://shist.app">Create your own list</a></p>
        </div>
    </div>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { listId } = req.query;
    console.log('Public List API - Method:', req.method, 'ListId:', listId);
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    if (!listId || typeof listId !== 'string') {
      return res.status(400).json({ message: 'List ID is required' });
    }

    if (req.method === 'GET') {
      console.log('Getting public list:', listId);
      
      const list = await getListWithDetails(listId);
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      if (!list.isPublic) {
        return res.status(403).json({ message: 'This list is private' });
      }

      // Generate HTML template
      const html = generateHTMLTemplate(list);
      
      // Set headers for HTML response
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      
      return res.status(200).send(html);
    }
    
    return res.status(405).json({ message: 'Method not allowed for public lists' });
  } catch (error) {
    console.error('Error in public list API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
