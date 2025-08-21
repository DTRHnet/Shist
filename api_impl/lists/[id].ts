import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      const list = {
        id: id as string,
        name: 'Sample List',
        description: 'A sample list for testing',
        isPublic: false,
        creatorId: 'default-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: []
      };

      return res.status(200).json(list);
    }

    if (req.method === 'PATCH') {
      const list = {
        id: id as string,
        name: req.body.name || 'Updated List',
        description: req.body.description || '',
        isPublic: req.body.isPublic || false,
        creatorId: 'default-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json(list);
    }

    if (req.method === 'DELETE') {
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list detail API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
