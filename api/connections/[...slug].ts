import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createConnection, getConnections, updateConnectionStatus } from '../lib/db';
import { createUser, getUser } from '../lib/db';

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

    // Handle /connections/:id/status
    const statusMatch = path.match(/^\/connections\/([^/]+)\/status$/);
    if (statusMatch) {
      const [, connectionId] = statusMatch;
      
      if (req.method === 'PATCH') {
        const connection = await updateConnectionStatus(connectionId, req.body.status);
        return res.status(200).json(connection);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /connections
    if (path === '/connections') {
      if (req.method === 'GET') {
        const defaultUserId = await ensureDefaultUser();
        const connections = await getConnections(defaultUserId);
        return res.status(200).json(connections);
      }
      
      if (req.method === 'POST') {
        const defaultUserId = await ensureDefaultUser();
        
        const connection = await createConnection({
          requesterId: defaultUserId,
          addresseeId: req.body.addresseeId,
          status: 'pending',
        });
        return res.status(201).json(connection);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in connections API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
