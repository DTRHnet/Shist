import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      // For Vercel serverless functions, we can't use sessions like in Express
      // Instead, we'll just return a success response
      // The client should clear any local storage or cookies
      
      return res.status(200).json({ 
        message: 'Logged out successfully',
        redirect: '/'
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in logout API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
