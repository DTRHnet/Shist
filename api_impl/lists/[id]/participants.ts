import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      const { id } = req.query;
      
      const participant = {
        id: `participant-${Date.now()}`,
        listId: id as string,
        userId: req.body.userId || 'other-user-id',
        canAdd: req.body.canAdd || false,
        canEdit: req.body.canEdit || false,
        canDelete: req.body.canDelete || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(201).json(participant);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list participants API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
