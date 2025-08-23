import { describe, it, expect, beforeEach } from 'vitest';
import { signInvitationToken, verifyInvitationToken, InvitationTokenPayloadSchema, roleToPermissions, RateLimiter, IdempotencyStore } from '../invitationsUtil';

describe('invitationsUtil', () => {
  it('signs and verifies token payload', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: 'abc123',
      inviterId: 'u1',
      listId: '10000000-0000-0000-0000-000000000000',
      invitationType: 'list' as const,
      role: 'editor' as const,
      iat: now,
      exp: now + 3600,
    };
    const token = signInvitationToken(payload);
    const decoded = verifyInvitationToken(token);
    expect(decoded).toEqual(payload);
    expect(() => verifyInvitationToken(token + 'x')).toThrowError();
  });

  it('maps role to permissions', () => {
    expect(roleToPermissions('viewer')).toEqual({ canAdd: true, canEdit: false, canDelete: false });
    expect(roleToPermissions('editor')).toEqual({ canAdd: true, canEdit: true, canDelete: false });
    expect(roleToPermissions('owner')).toEqual({ canAdd: true, canEdit: true, canDelete: true });
  });

  it('rate limiter allows within window', () => {
    const rl = new RateLimiter();
    const key = 'ip:1';
    const limit = 3;
    const windowMs = 1000;
    expect(rl.allow(key, limit, windowMs)).toBe(true);
    expect(rl.allow(key, limit, windowMs)).toBe(true);
    expect(rl.allow(key, limit, windowMs)).toBe(true);
    expect(rl.allow(key, limit, windowMs)).toBe(false);
  });

  it('idempotency store prevents duplicates', () => {
    const store = new IdempotencyStore(1000);
    const key = 'idem-1';
    expect(store.has(key)).toBe(false);
    store.add(key);
    expect(store.has(key)).toBe(true);
  });
});