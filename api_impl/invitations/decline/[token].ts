import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { token } = req.query;
      
      const invitation = await storage.getInvitationByToken(token as string);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      await storage.updateInvitationStatus(invitation.id, 'cancelled');
      return res.status(200).json({ message: 'Invitation declined' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in decline invitation API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
