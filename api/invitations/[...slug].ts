import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInvitation, getInvitationByToken, updateInvitationStatus } from '../lib/db';
import { createUser, getUser } from '../lib/db';
import { generateInvitationToken, getExpirationDate } from '../lib/invitationUtils';

// Ensure default user exists
async function ensureDefaultUser() {
  try {
    const defaultUserId = 'default-user-id';
    const defaultUser = await getUser(defaultUserId);
    
    if (!defaultUser) {
      await createUser({
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
        const invitation = await getInvitationByToken(token);
        
        if (!invitation) {
          return res.status(404).json({ message: 'Invitation not found' });
        }
        
        if (invitation.status !== 'pending') {
          return res.status(400).json({ message: 'Invitation already processed' });
        }
        
        const updatedInvitation = await updateInvitationStatus(invitation.id, 'accepted', new Date());
        return res.status(200).json(updatedInvitation);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/decline/:token
    const declineMatch = path.match(/^\/invitations\/decline\/([^/]+)$/);
    if (declineMatch) {
      const [, token] = declineMatch;
      
      if (req.method === 'POST') {
        const invitation = await getInvitationByToken(token);
        
        if (!invitation) {
          return res.status(404).json({ message: 'Invitation not found' });
        }
        
        if (invitation.status !== 'pending') {
          return res.status(400).json({ message: 'Invitation already processed' });
        }
        
        const updatedInvitation = await updateInvitationStatus(invitation.id, 'declined');
        return res.status(200).json(updatedInvitation);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/received
    if (path === '/invitations/received') {
      if (req.method === 'GET') {
        // For now, return empty array since we need to implement this
        return res.status(200).json([]);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/sent
    if (path === '/invitations/sent') {
      if (req.method === 'GET') {
        // For now, return empty array since we need to implement this
        return res.status(200).json([]);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations/cleanup
    if (path === '/invitations/cleanup') {
      if (req.method === 'POST') {
        // For now, return success since we need to implement this
        return res.status(200).json({ success: true });
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /invitations
    if (path === '/invitations') {
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        
        const invitation = await createInvitation({
          token: generateInvitationToken(),
          inviterId: defaultUserId,
          recipientEmail: req.body.recipientEmail,
          recipientPhone: req.body.recipientPhone,
          invitationType: req.body.invitationType || 'connection',
          listId: req.body.listId,
          expiresAt: getExpirationDate(),
          status: 'pending',
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
