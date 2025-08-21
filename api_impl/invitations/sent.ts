import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../server/storage';

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

    if (req.method === 'GET') {
      const invitations = await storage.getSentInvitations(userId);
      return res.status(200).json(invitations);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in sent invitations API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
