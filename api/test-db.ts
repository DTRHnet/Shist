import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		if (!process.env.DATABASE_URL) {
			return res.status(500).json({ ok: false, message: 'DATABASE_URL not set' });
		}
		const pool = new Pool({ connectionString: process.env.DATABASE_URL });
		try {
			await pool.query('SELECT 1');
			return res.status(200).json({ ok: true, message: 'DB connection successful' });
		} finally {
			await pool.end();
		}
	} catch (error) {
		console.error('test-db error', error);
		return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'unknown' });
	}
}