import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { insertInvitationSchema } from '@shared/schema';
import { createInvitationServices, InvitationUtils } from '../../server/invitationService';

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

    if (req.method === 'POST') {
      const invitationData = insertInvitationSchema.parse({
        ...req.body,
        inviterId: userId,
        expiresAt: InvitationUtils.getExpirationDate(),
      });

      // Generate unique token
      const token = InvitationUtils.generateInvitationToken();
      const invitation = await storage.createInvitation({
        ...invitationData,
        token,
      });

      // Get inviter details for sending
      const inviter = await storage.getUser(userId);
      if (!inviter) {
        return res.status(404).json({ message: 'User not found' });
      }

      const inviterName = inviter.firstName 
        ? `${inviter.firstName} ${inviter.lastName || ''}`.trim()
        : inviter.email || 'Someone';

      // Generate invitation link
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      const invitationLink = InvitationUtils.generateInvitationLink(token, baseUrl);

      // Get list name if it's a list invitation
      let listName: string | undefined;
      if (invitationData.invitationType === 'list' && invitationData.listId) {
        const list = await storage.getListById(invitationData.listId);
        listName = list?.name;
      }

      // Send invitation via email or SMS (simplified for now)
      const { emailService, smsService } = createInvitationServices();
      try {
        if (invitationData.recipientEmail) {
          await emailService.sendInvitationEmail(
            invitationData.recipientEmail,
            inviterName,
            invitationLink,
            invitationData.invitationType as 'connection' | 'list',
            listName
          );
        } else if (invitationData.recipientPhone) {
          await smsService.sendInvitationSMS(
            invitationData.recipientPhone,
            inviterName,
            invitationLink,
            invitationData.invitationType as 'connection' | 'list',
            listName
          );
        }
      } catch (sendError) {
        console.error('Error sending invitation:', sendError);
        // Still return success since invitation was created
      }

      return res.status(201).json(invitation);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in invitations API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
