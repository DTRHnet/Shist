import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Test Lists API - Method:', req.method, 'URL:', req.url, 'Body:', req.body);
    
    return res.status(200).json({ 
      message: 'Test lists endpoint working',
      method: req.method,
      url: req.url,
      body: req.body
    });
  } catch (error) {
    console.error('Error in test lists API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
