import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { addresseeEmail } = req.body;

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
    console.error('Error in connection invite API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
