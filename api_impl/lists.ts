import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      // Create a mock list
      const list = {
        id: `list-${Date.now()}`,
        name: req.body.name || 'New List',
        description: req.body.description || '',
        isPublic: req.body.isPublic || false,
        creatorId: 'default-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(201).json(list);
    }

    if (req.method === 'GET') {
      // Return mock lists
      const lists = [
        {
          id: 'list-1',
          name: 'My First List',
          description: 'A sample list',
          isPublic: false,
          creatorId: 'default-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: []
        }
      ];

      return res.status(200).json(lists);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in lists API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
