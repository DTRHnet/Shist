import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Return mock connections
      const connections = [
        {
          id: 'connection-1',
          requesterId: 'default-user-id',
          addresseeId: 'other-user-id',
          status: 'accepted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return res.status(200).json(connections);
    }

    if (req.method === 'POST') {
      // Create a mock connection
      const connection = {
        id: `connection-${Date.now()}`,
        requesterId: 'default-user-id',
        addresseeId: 'other-user-id',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(201).json(connection);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in connections API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
