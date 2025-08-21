import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // For now, create a default user if none exists
      // This is a temporary solution to get the app working
      let user = await storage.getUserByEmail('default@shist.app');
      
      if (!user) {
        // Create a default user
        user = await storage.createUser({
          email: 'default@shist.app',
          firstName: 'Default',
          lastName: 'User',
        });
      }

      return res.status(200).json(user);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in auth user API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
