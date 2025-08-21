import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { listId, itemId } = req.query;

    if (req.method === 'PATCH') {
      const item = {
        id: itemId as string,
        listId: listId as string,
        content: req.body.content || 'Updated item',
        note: req.body.note || '',
        url: req.body.url || '',
        categoryId: req.body.categoryId || null,
        addedById: 'default-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json(item);
    }

    if (req.method === 'DELETE') {
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list item detail API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
