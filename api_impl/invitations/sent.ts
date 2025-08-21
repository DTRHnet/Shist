import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const invitations = [
        {
          id: 'invitation-1',
          inviterId: 'default-user-id',
          recipientEmail: 'friend@example.com',
          invitationType: 'connection',
          status: 'pending',
          token: 'token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      return res.status(200).json(invitations);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in sent invitations API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
