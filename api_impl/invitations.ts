import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      // Create a mock invitation
      const invitation = {
        id: `invitation-${Date.now()}`,
        inviterId: 'default-user-id',
        recipientEmail: req.body.recipientEmail,
        recipientPhone: req.body.recipientPhone,
        invitationType: req.body.invitationType || 'connection',
        listId: req.body.listId,
        status: 'pending',
        token: `token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(201).json(invitation);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in invitations API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
