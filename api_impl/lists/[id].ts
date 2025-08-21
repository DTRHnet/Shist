import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../server/storage';

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

    const { id } = req.query;

    if (req.method === 'GET') {
      const list = await storage.getListById(id as string);
      
      if (!list) {
        return res.status(404).json({ message: 'List not found' });
      }

      return res.status(200).json(list);
    }

    if (req.method === 'PATCH') {
      const updates = req.body;
      const list = await storage.updateList(id as string, updates);
      return res.status(200).json(list);
    }

    if (req.method === 'DELETE') {
      await storage.deleteList(id as string);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list detail API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
