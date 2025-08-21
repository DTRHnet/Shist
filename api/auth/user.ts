import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Return a default user for now
      const user = {
        id: 'default-user-id',
        email: 'default@shist.app',
        firstName: 'Default',
        lastName: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json(user);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in auth user API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
