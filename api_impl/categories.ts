import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      // Return default categories for now
      const categories = [
        {
          id: '1',
          name: 'Music',
          description: 'Music and audio content',
          icon: '🎵',
          color: '#3B82F6',
          subcategories: [
            { id: '1-1', name: 'Songs', description: 'Individual songs' },
            { id: '1-2', name: 'Albums', description: 'Music albums' },
            { id: '1-3', name: 'Playlists', description: 'Music playlists' }
          ]
        },
        {
          id: '2',
          name: 'Movies',
          description: 'Movies and films',
          icon: '🎬',
          color: '#EF4444',
          subcategories: [
            { id: '2-1', name: 'Action', description: 'Action movies' },
            { id: '2-2', name: 'Comedy', description: 'Comedy movies' },
            { id: '2-3', name: 'Drama', description: 'Drama movies' }
          ]
        },
        {
          id: '3',
          name: 'Books',
          description: 'Books and literature',
          icon: '📚',
          color: '#10B981',
          subcategories: [
            { id: '3-1', name: 'Fiction', description: 'Fiction books' },
            { id: '3-2', name: 'Non-fiction', description: 'Non-fiction books' },
            { id: '3-3', name: 'Biography', description: 'Biographies' }
          ]
        }
      ];
      return res.status(200).json(categories);
    }

    if (req.method === 'POST') {
      // For now, just return success
      return res.status(201).json({ message: 'Category created successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
