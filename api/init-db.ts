import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import * as schema from "../schema";

neonConfig.webSocketConstructor = ws;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ 
        message: 'Database not configured. Please set DATABASE_URL environment variable.',
        error: 'DATABASE_URL missing'
      });
    }

    if (req.method === 'POST') {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const db = drizzle({ client: pool, schema });

      try {
        // Test database connection
        await pool.query('SELECT 1');
        
        // Try to create a test user
        const testUser = {
          id: 'test-user',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          const [user] = await db
            .insert(schema.users)
            .values(testUser)
            .onConflictDoUpdate({
              target: schema.users.id,
              set: testUser,
            })
            .returning();

          return res.status(200).json({ 
            message: 'Database initialized successfully',
            user,
            status: 'connected'
          });
        } catch (tableError) {
          return res.status(500).json({ 
            message: 'Database connected but tables may not exist',
            error: tableError instanceof Error ? tableError.message : 'Table error',
            status: 'connected_no_tables'
          });
        }
      } catch (connectionError) {
        return res.status(500).json({ 
          message: 'Database connection failed',
          error: connectionError instanceof Error ? connectionError.message : 'Connection error',
          status: 'connection_failed'
        });
      } finally {
        await pool.end();
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in init-db API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
