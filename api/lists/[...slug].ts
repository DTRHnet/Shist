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

async function createList(listData: any) {
  const database = await getDb();
  const [list] = await database.insert(schema.lists).values(listData).returning();
  return list;
}

async function getLists(userId: string) {
  const database = await getDb();
  
  // Get basic lists
  const lists = await database
    .select()
    .from(schema.lists)
    .where(eq(schema.lists.creatorId, userId));
  
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

async function getListById(id: string) {
  const database = await getDb();
  const [list] = await database.select().from(schema.lists).where(eq(schema.lists.id, id));
  
  if (!list) {
    return null;
  }
  
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
    items.map(async (item) => {
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
}

async function updateList(id: string, updates: any) {
  const database = await getDb();
  const [list] = await database
    .update(schema.lists)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.lists.id, id))
    .returning();
  return list;
}

async function deleteList(id: string) {
  const database = await getDb();
  await database.delete(schema.lists).where(eq(schema.lists.id, id));
}

async function addListItem(itemData: any) {
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

async function updateListItem(id: string, updates: any) {
  const database = await getDb();
  const [item] = await database
    .update(schema.listItems)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.listItems.id, id))
    .returning();
  return item;
}

async function deleteListItem(id: string) {
  const database = await getDb();
  await database.delete(schema.listItems).where(eq(schema.listItems.id, id));
}

async function addListParticipant(participantData: any) {
  const database = await getDb();
  const [participant] = await database.insert(schema.listParticipants).values(participantData).returning();
  return participant;
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
    const url = req.url || '';
    const path = url.replace(/^\/api/, '');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Handle /lists/:listId/items/:itemId
    const itemMatch = path.match(/^\/lists\/([^/]+)\/items\/([^/]+)$/);
    if (itemMatch) {
      const [, listId, itemId] = itemMatch;
      
      if (req.method === 'PATCH') {
        const item = await updateListItem(itemId, {
          content: req.body.content,
          note: req.body.note,
          url: req.body.url,
          categoryId: req.body.categoryId,
          metadata: req.body.metadata,
        });
        return res.status(200).json(item);
      }
      
      if (req.method === 'DELETE') {
        await deleteListItem(itemId);
        return res.status(200).json({ success: true });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /lists/:listId/participants
    const participantsMatch = path.match(/^\/lists\/([^/]+)\/participants$/);
    if (participantsMatch) {
      const [, listId] = participantsMatch;
      
      if (req.method === 'POST') {
        const participant = await addListParticipant({
          listId,
          userId: req.body.userId,
          canAdd: req.body.canAdd || true,
          canEdit: req.body.canEdit || false,
          canDelete: req.body.canDelete || false,
        });
        return res.status(201).json(participant);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /lists/:listId/items
    const itemsMatch = path.match(/^\/lists\/([^/]+)\/items$/);
    if (itemsMatch) {
      const [, listId] = itemsMatch;
      
      if (req.method === 'GET') {
        const items = await getListItems(listId);
        return res.status(200).json(items);
      }
      
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        
        const item = await addListItem({
          listId,
          content: req.body.content || 'New item',
          note: req.body.note || '',
          url: req.body.url || '',
          categoryId: req.body.categoryId || null,
          addedById: defaultUserId,
          metadata: req.body.metadata,
        });
        return res.status(201).json(item);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /lists/:listId
    const listMatch = path.match(/^\/lists\/([^/]+)$/);
    if (listMatch) {
      const [, listId] = listMatch;
      
      if (req.method === 'GET') {
        const list = await getListById(listId);
        
        if (!list) {
          return res.status(404).json({ message: 'List not found' });
        }
        
        return res.status(200).json(list);
      }
      
      if (req.method === 'PATCH') {
        const list = await updateList(listId, {
          name: req.body.name,
          description: req.body.description,
          isPublic: req.body.isPublic,
        });
        return res.status(200).json(list);
      }
      
      if (req.method === 'DELETE') {
        await deleteList(listId);
        return res.status(200).json({ success: true });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /list/:listId (alternative route)
    const altListMatch = path.match(/^\/list\/([^/]+)$/);
    if (altListMatch) {
      const [, listId] = altListMatch;
      
      if (req.method === 'GET') {
        const list = await getListById(listId);
        
        if (!list) {
          return res.status(404).json({ message: 'List not found' });
        }
        
        return res.status(200).json(list);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /lists
    if (path === '/lists') {
      if (req.method === 'GET') {
        const defaultUserId = await ensureDefaultUser();
        const lists = await getLists(defaultUserId);
        return res.status(200).json(lists);
      }
      
      if (req.method === 'POST') {
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
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in lists API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
