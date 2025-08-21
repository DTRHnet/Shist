import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { InvitationUtils } from '../../server/invitationService';

// Ensure default user exists
async function ensureDefaultUser() {
  const defaultUserId = 'default-user-id';
  const defaultUser = await storage.getUser(defaultUserId);
  
  if (!defaultUser) {
    await storage.upsertUser({
      id: defaultUserId,
      email: 'default@example.com',
      firstName: 'Default',
      lastName: 'User',
    });
  }
  
  return defaultUserId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const defaultUserId = await ensureDefaultUser();
      
      // Generate unique token
      const token = InvitationUtils.generateInvitationToken();
      
      const invitation = await storage.createInvitation({
        inviterId: defaultUserId,
        recipientEmail: req.body.recipientEmail,
        recipientPhone: req.body.recipientPhone,
        invitationType: req.body.invitationType || 'connection',
        listId: req.body.listId,
        status: 'pending',
        token,
        expiresAt: InvitationUtils.getExpirationDate(),
      });

      return res.status(201).json(invitation);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in invitations API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
