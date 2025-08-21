import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../../server/storage';
import { insertListParticipantSchema } from '@shared/schema';

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

    if (req.method === 'POST') {
      const { id } = req.query;
      const participantData = insertListParticipantSchema.parse({
        listId: id as string,
        ...req.body,
      });

      const participant = await storage.addListParticipant(participantData);
      return res.status(201).json(participant);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in list participants API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
