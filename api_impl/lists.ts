import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { insertListSchema } from '@shared/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Get or create default user
    let user = await storage.getUserByEmail('default@shist.app');
    if (!user) {
      user = await storage.createUser({
        email: 'default@shist.app',
        firstName: 'Default',
        lastName: 'User',
      });
    }
    const userId = user.id;

    if (req.method === 'POST') {
      const listData = insertListSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const list = await storage.createList(listData);
      
      // Add creator as participant with full permissions
      await storage.addListParticipant({
        listId: list.id,
        userId,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      });

      return res.status(201).json(list);
    }

    if (req.method === 'GET') {
      const lists = await storage.getUserLists(userId);
      return res.status(200).json(lists);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in lists API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
