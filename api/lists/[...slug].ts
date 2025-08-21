import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'default-user-id';
    const defaultUser = await storage.getUser(defaultUserId);
    
    if (!defaultUser) {
      await storage.upsertUser({
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
        const item = await storage.updateListItem(itemId, {
          content: req.body.content,
          note: req.body.note,
          url: req.body.url,
          categoryId: req.body.categoryId,
          metadata: req.body.metadata,
        });
        return res.status(200).json(item);
      }
      
      if (req.method === 'DELETE') {
        await storage.deleteListItem(itemId);
        return res.status(200).json({ success: true });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /lists/:listId/participants
    const participantsMatch = path.match(/^\/lists\/([^/]+)\/participants$/);
    if (participantsMatch) {
      const [, listId] = participantsMatch;
      
      if (req.method === 'POST') {
        const participant = await storage.addListParticipant({
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
      
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        
        const item = await storage.addListItem({
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
        const list = await storage.getListById(listId);
        
        if (!list) {
          return res.status(404).json({ message: 'List not found' });
        }
        
        return res.status(200).json(list);
      }
      
      if (req.method === 'PATCH') {
        const list = await storage.updateList(listId, {
          name: req.body.name,
          description: req.body.description,
          isPublic: req.body.isPublic,
        });
        return res.status(200).json(list);
      }
      
      if (req.method === 'DELETE') {
        await storage.deleteList(listId);
        return res.status(200).json({ success: true });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /list/:listId (alternative route)
    const altListMatch = path.match(/^\/list\/([^/]+)$/);
    if (altListMatch) {
      const [, listId] = altListMatch;
      
      if (req.method === 'GET') {
        const list = await storage.getListById(listId);
        
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
        const lists = await storage.getUserLists(defaultUserId);
        return res.status(200).json(lists);
      }
      
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        
        const list = await storage.createList({
          name: req.body.name || 'New List',
          description: req.body.description || '',
          isPublic: req.body.isPublic || false,
          creatorId: defaultUserId,
        });

        // Add creator as participant with full permissions
        await storage.addListParticipant({
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
