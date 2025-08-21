import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler0 from '../../api_impl/categories'
import handler1 from '../../api_impl/categories/[categoryId]'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace(/^\/api/, '');
  if (new RegExp('^/categories/([^/]+)$').test(path)) return handler1(req, res);
  if (new RegExp('^/categories$').test(path)) return handler0(req, res);
  // fallback: method not allowed
  return res.status(404).json({ ok: false, error: 'no matching route', path });
}
