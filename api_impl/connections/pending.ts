import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const invitations = [
        {
          id: 'invitation-1',
          requesterId: 'other-user-id',
          addresseeId: 'default-user-id',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return res.status(200).json(invitations);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in pending connections API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
