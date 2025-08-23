import { getRequestId, log } from './logger';
import type { Request } from 'express';

export type AnalyticsEvent =
  | { type: 'list_created'; listId: string; userId: string }
  | { type: 'list_shared'; listId: string; userId: string; targetUserId: string }
  | { type: 'invite_sent'; listId?: string; inviterId: string; channel: 'email' | 'sms' }
  | { type: 'invite_accepted'; listId?: string; userId: string }
  | { type: 'subscription_updated'; userId: string; status: string }
  | { type: 'subscription_canceled'; userId: string };

export function track(req: Request, event: AnalyticsEvent) {
  log({ level: 'info', msg: 'analytics', reqId: getRequestId(req), meta: event });
}