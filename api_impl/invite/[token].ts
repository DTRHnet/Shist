import type { VercelRequest, VercelResponse } from '@vercel/node';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).json({ ok: true, route: '/invite/:token', method: req.method });
  return res.status(405).send('Method Not Allowed');
}
