import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { InvitationUtils } from '../../server/invitationService';

// Ensure default user exists
async function ensureDefaultUser() {
  try {
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
  } catch (error) {
    console.error('Error ensuring default user:', error);
    throw new Error('Failed to initialize default user');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = req.url || '';
    const path = url.replace(/^\/api/, '');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Handle /invitations/accept/:token
    const acceptMatch = path.match(/^\/invitations\/accept\/([^/]+)$/);
    if (acceptMatch) {
      const [, token] = acceptMatch;
      
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();

        const invitation = await storage.getInvitationByToken(token);
        if (!invitation) {
          return res.status(404).json({ message: "Invitation not found" });
        }

        if (invitation.status !== 'pending') {
          return res.status(400).json({ message: "Invitation is no longer valid" });
        }

        if (new Date(invitation.expiresAt) < new Date()) {
          return res.status(400).json({ message: "Invitation has expired" });
        }

        // Process the invitation based on type
        if (invitation.invitationType === 'connection') {
          // Create connection if it doesn't exist
          const existingConnection = await storage.getConnectionByUsers(
            invitation.inviterId,
            defaultUserId
          );
          
          if (!existingConnection) {
            await storage.createConnection({
              requesterId: invitation.inviterId,
              addresseeId: defaultUserId,
              status: 'accepted'
            });
          } else if (existingConnection.status !== 'accepted') {
            await storage.updateConnectionStatus(existingConnection.id, 'accepted');
          }
        } else if (invitation.invitationType === 'list' && invitation.listId) {
          // Add user to the list
          await storage.addListParticipant({
            listId: invitation.listId,
            userId: defaultUserId,
            canAdd: true,
            canEdit: false,
            canDelete: false,
          });
        }

        // Mark invitation as accepted
        await storage.updateInvitationStatus(invitation.id, 'accepted', new Date());

        return res.status(200).json({ message: "Invitation accepted successfully" });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/decline/:token
    const declineMatch = path.match(/^\/invitations\/decline\/([^/]+)$/);
    if (declineMatch) {
      const [, token] = declineMatch;
      
      if (req.method === 'POST') {
        const invitation = await storage.getInvitationByToken(token);
        if (!invitation) {
          return res.status(404).json({ message: "Invitation not found" });
        }

        await storage.updateInvitationStatus(invitation.id, 'cancelled');
        return res.status(200).json({ message: "Invitation declined" });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/received
    if (path === '/invitations/received') {
      if (req.method === 'GET') {
        const defaultUserId = await ensureDefaultUser();
        const invitations = await storage.getUserInvitations(defaultUserId);
        return res.status(200).json(invitations);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/sent
    if (path === '/invitations/sent') {
      if (req.method === 'GET') {
        const defaultUserId = await ensureDefaultUser();
        const invitations = await storage.getSentInvitations(defaultUserId);
        return res.status(200).json(invitations);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/cleanup
    if (path === '/invitations/cleanup') {
      if (req.method === 'POST') {
        await storage.expireOldInvitations();
        return res.status(200).json({ message: "Expired invitations cleaned up" });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations
    if (path === '/invitations') {
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
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in invitations API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
