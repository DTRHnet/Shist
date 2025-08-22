import type { Request, Response, NextFunction } from 'express';

type HitWindow = { count: number; resetAt: number };
const ipWindows = new Map<string, HitWindow>();

export function createRateLimitMiddleware({ limit, windowMs }: { limit: number; windowMs: number }) {
  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const now = Date.now();
    const win = ipWindows.get(key);
    if (!win || win.resetAt < now) {
      ipWindows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (win.count >= limit) {
      const retry = Math.max(0, win.resetAt - now);
      res.setHeader('Retry-After', Math.ceil(retry / 1000));
      return res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' } });
    }
    win.count += 1;
    next();
  };
}