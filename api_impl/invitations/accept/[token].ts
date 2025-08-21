import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../../server/storage';

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
      const { token } = req.query;

      const invitation = await storage.getInvitationByToken(token as string);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: 'Invitation is no longer valid' });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }

      // Process the invitation based on type
      if (invitation.invitationType === 'connection') {
        // Create connection if it doesn't exist
        const existingConnection = await storage.getConnectionByUsers(
          invitation.inviterId,
          userId
        );
        
        if (!existingConnection) {
          await storage.createConnection({
            requesterId: invitation.inviterId,
            addresseeId: userId,
            status: 'accepted'
          });
        } else if (existingConnection.status !== 'accepted') {
          await storage.updateConnectionStatus(existingConnection.id, 'accepted');
        }
      } else if (invitation.invitationType === 'list' && invitation.listId) {
        // Add user to the list
        await storage.addListParticipant({
          listId: invitation.listId,
          userId: userId,
          canAdd: true,
          canEdit: false,
          canDelete: false,
        });
      }

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted', new Date());

      return res.status(200).json({ message: 'Invitation accepted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in accept invitation API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
