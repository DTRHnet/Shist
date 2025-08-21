import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { token } = req.query;

      // Mock acceptance
      return res.status(200).json({ message: 'Invitation accepted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in accept invitation API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
