import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const categories = await storage.getCategories();
      return res.status(200).json(categories);
    }

    if (req.method === 'POST') {
      const category = await storage.createCategory({
        name: req.body.name,
        icon: req.body.icon || '📝',
        parentId: req.body.parentId,
        metadata: req.body.metadata,
      });
      return res.status(201).json(category);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
