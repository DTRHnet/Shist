import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../../../server/storage';
import { insertListItemSchema } from '@shared/schema';

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

    const { listId, itemId } = req.query;

    if (req.method === 'PATCH') {
      const updates = insertListItemSchema.partial().parse(req.body);

      if (!updates.content && !updates.note && !updates.url && !updates.categoryId && !updates.metadata) {
        return res.status(400).json({ message: 'At least one field is required to update' });
      }

      const item = await storage.updateListItem(itemId as string, updates);
      return res.status(200).json(item);
    }

    if (req.method === 'DELETE') {
      await storage.deleteListItem(itemId as string);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list item detail API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
