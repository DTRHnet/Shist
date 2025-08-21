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
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
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

    if (req.method === 'GET') {
      const defaultUserId = await ensureDefaultUser();
      const lists = await storage.getUserLists(defaultUserId);
      return res.status(200).json(lists);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in lists API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
