import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler0 from '../../api_impl/lists'
import handler1 from '../../api_impl/lists/[id]'
import handler2 from '../../api_impl/lists/[id]/items'
import handler3 from '../../api_impl/lists/[id]/participants'
import handler4 from '../../api_impl/lists/[listId]/items/[itemId]'
import handler5 from '../../api_impl/list/[listId]'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace(/^\/api/, '');
  if (new RegExp('^/lists/([^/]+)/items/([^/]+)$').test(path)) return handler4(req, res);
  if (new RegExp('^/lists/([^/]+)/participants$').test(path)) return handler3(req, res);
  if (new RegExp('^/lists/([^/]+)/items$').test(path)) return handler2(req, res);
  if (new RegExp('^/lists/([^/]+)$').test(path)) return handler1(req, res);
  if (new RegExp('^/list/([^/]+)$').test(path)) return handler5(req, res);
  if (new RegExp('^/lists$').test(path)) return handler0(req, res);
  // fallback: method not allowed
  return res.status(404).json({ ok: false, error: 'no matching route', path });
}
