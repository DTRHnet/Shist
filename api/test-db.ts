import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check environment variables
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const nodeEnv = process.env.NODE_ENV;
    const vercelEnv = process.env.VERCEL_ENV;
    
    if (!hasDatabaseUrl) {
      return res.status(500).json({
        success: false,
        message: 'DATABASE_URL environment variable is not set',
        environment: {
          NODE_ENV: nodeEnv,
          VERCEL_ENV: vercelEnv,
          hasDatabaseUrl
        }
      });
    }

    // Try to import and use storage
    try {
      const { storage } = await import('../server/storage');
      
      // Test database connection by trying to get categories
      const categories = await storage.getCategories();
      
      return res.status(200).json({
        success: true,
        message: 'Database connection working',
        environment: {
          NODE_ENV: nodeEnv,
          VERCEL_ENV: vercelEnv,
          hasDatabaseUrl
        },
        categoriesCount: categories.length,
        categories: categories.slice(0, 3) // Return first 3 categories
      });
    } catch (storageError) {
      console.error('Storage import error:', storageError);
      return res.status(500).json({
        success: false,
        message: 'Failed to import storage module',
        error: storageError instanceof Error ? storageError.message : 'Unknown error',
        environment: {
          NODE_ENV: nodeEnv,
          VERCEL_ENV: vercelEnv,
          hasDatabaseUrl
        }
      });
    }
  } catch (error) {
    console.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  }
}
