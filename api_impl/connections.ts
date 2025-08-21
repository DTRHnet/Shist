import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

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
    if (req.method === 'GET') {
      const defaultUserId = await ensureDefaultUser();
      const connections = await storage.getUserConnections(defaultUserId);
      return res.status(200).json(connections);
    }

    if (req.method === 'POST') {
      const defaultUserId = await ensureDefaultUser();
      
      const connection = await storage.createConnection({
        requesterId: defaultUserId,
        addresseeId: req.body.addresseeId || 'other-user-id',
        status: 'pending',
      });

      return res.status(201).json(connection);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in connections API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
