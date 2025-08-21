import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler0 from '../../api_impl/invitations'
import handler1 from '../../api_impl/invitations/accept/[token]'
import handler2 from '../../api_impl/invitations/decline/[token]'
import handler3 from '../../api_impl/invitations/cleanup'
import handler4 from '../../api_impl/invitations/sent'
import handler5 from '../../api_impl/invitations/received'
import handler6 from '../../api_impl/invite/[token]'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace(/^\/api/, '');
  if (new RegExp('^/invitations/decline/([^/]+)$').test(path)) return handler2(req, res);
  if (new RegExp('^/invitations/accept/([^/]+)$').test(path)) return handler1(req, res);
  if (new RegExp('^/invitations/received$').test(path)) return handler5(req, res);
  if (new RegExp('^/invitations/cleanup$').test(path)) return handler3(req, res);
  if (new RegExp('^/invitations/sent$').test(path)) return handler4(req, res);
  if (new RegExp('^/invite/([^/]+)$').test(path)) return handler6(req, res);
  if (new RegExp('^/invitations$').test(path)) return handler0(req, res);
  // fallback: method not allowed
  return res.status(404).json({ ok: false, error: 'no matching route', path });
}
