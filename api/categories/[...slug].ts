import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = req.url || '';
    const path = url.replace(/^\/api/, '');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Handle /categories/:categoryId
    const categoryIdMatch = path.match(/^\/categories\/([^/]+)$/);
    if (categoryIdMatch) {
      const categoryId = categoryIdMatch[1];
      
      if (req.method === 'GET') {
        const category = await storage.getCategoryById(categoryId);
        
        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }
        
        return res.status(200).json(category);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Handle /categories
    if (path === '/categories') {
      if (req.method === 'GET') {
        const categories = await storage.getCategories();
        return res.status(200).json(categories);
      }
      
      if (req.method === 'POST') {
        const category = await storage.createCategory({
          name: req.body.name,
          icon: req.body.icon || '📝',
          parentId: req.body.parentId,
          metadata: req.body.metadata,
        });
        return res.status(201).json(category);
      }
      
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // fallback: no matching route
    return res.status(404).json({ ok: false, error: 'no matching route', path });
  } catch (error) {
    console.error('Error in categories API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
