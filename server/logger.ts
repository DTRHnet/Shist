import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function getRequestId(req: Request): string {
  return (req as any).reqId as string;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerId = req.header('x-request-id');
  const reqId = headerId && headerId.trim() !== '' ? headerId : randomUUID();
  (req as any).reqId = reqId;
  res.setHeader('x-request-id', reqId);
  next();
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogFields {
  level: LogLevel;
  msg: string;
  reqId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
  err?: { name: string; message: string; stack?: string };
}

export function log(fields: LogFields) {
  const line = { ts: new Date().toISOString(), ...fields };
  console.log(JSON.stringify(line));
}

export function logRequest(req: Request, res: Response, start: number) {
  const durationMs = Date.now() - start;
  log({
    level: 'info',
    msg: 'http_request',
    reqId: getRequestId(req),
    path: req.path,
    method: req.method,
    statusCode: res.statusCode,
    durationMs,
  });
}

export function logError(req: Request, error: unknown) {
  const err = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { name: 'Unknown', message: String(error) };
  log({ level: 'error', msg: 'http_error', reqId: getRequestId(req), path: req.path, method: req.method, err });
}