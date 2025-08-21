import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    if (req.method === 'POST') {
      const { createUser, getUser } = await import('../lib/db');
      
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Create or get user based on email
      const [firstName, lastName] = (name || 'Local User').split(' ');
      
      const user = await createUser({
        id: email, // Use email as user ID for simplicity
        email,
        firstName,
        lastName: lastName || '',
      });

      return res.status(200).json({ 
        user,
        message: 'Login successful'
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in local-auth API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
