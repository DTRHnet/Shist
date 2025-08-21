import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../../server/storage';

// Ensure default user exists
async function ensureDefaultUser() {
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { id } = req.query;
      const listId = id as string;
      
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
  } catch (error) {
    console.error('Error in list items API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
