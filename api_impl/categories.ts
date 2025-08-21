import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { insertCategorySchema } from '@shared/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const categories = await storage.getCategories();
      return res.status(200).json(categories);
    }

    if (req.method === 'POST') {
      // Get user from session (simplified for now)
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      return res.status(201).json(category);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
