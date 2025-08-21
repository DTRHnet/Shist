import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler0 from '../../api_impl/connections'
import handler1 from '../../api_impl/connections/[id]/status'
import handler2 from '../../api_impl/connections/invite'
import handler3 from '../../api_impl/connections/pending'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace(/^\/api/, '');
  if (new RegExp('^/connections/([^/]+)/status$').test(path)) return handler1(req, res);
  if (new RegExp('^/connections/pending$').test(path)) return handler3(req, res);
  if (new RegExp('^/connections/invite$').test(path)) return handler2(req, res);
  if (new RegExp('^/connections$').test(path)) return handler0(req, res);
  // fallback: method not allowed
  return res.status(404).json({ ok: false, error: 'no matching route', path });
}
