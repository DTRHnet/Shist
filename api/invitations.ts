import type { VercelRequest, VercelResponse } from '@vercel/node';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') return res.status(200).json({ ok: true, route: '/api/invitations', method: req.method });
  return res.status(405).send('Method Not Allowed');
}
