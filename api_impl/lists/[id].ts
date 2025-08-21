import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    const listId = id as string;

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
  } catch (error) {
    console.error('Error in list detail API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
