import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { insertConnectionSchema } from '@shared/schema';

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
      const connections = await storage.getUserConnections(userId);
      return res.status(200).json(connections);
    }

    if (req.method === 'POST') {
      const { addresseeEmail } = req.body;

      // Find addressee by email
      const addressee = await storage.getUserByEmail(addresseeEmail);
      if (!addressee) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if connection already exists
      const existingConnection = await storage.getConnectionByUsers(userId, addressee.id);
      if (existingConnection) {
        return res.status(400).json({ message: 'Connection already exists' });
      }

      const connectionData = insertConnectionSchema.parse({
        requesterId: userId,
        addresseeId: addressee.id,
      });

      const connection = await storage.createConnection(connectionData);
      return res.status(201).json(connection);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in connections API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
