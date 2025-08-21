import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { id } = req.query;
      
      const item = {
        id: `item-${Date.now()}`,
        listId: id as string,
        content: req.body.content || 'New item',
        note: req.body.note || '',
        url: req.body.url || '',
        categoryId: req.body.categoryId || null,
        addedById: 'default-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(201).json(item);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list items API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
