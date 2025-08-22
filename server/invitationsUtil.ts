import crypto from "node:crypto";
import { z } from "zod";

export const InvitationRoleSchema = z.enum(["viewer", "editor", "owner"]);
export type InvitationRole = z.infer<typeof InvitationRoleSchema>;

export function roleToPermissions(role: InvitationRole) {
  if (role === "owner") return { canAdd: true, canEdit: true, canDelete: true };
  if (role === "editor") return { canAdd: true, canEdit: true, canDelete: false };
  return { canAdd: true, canEdit: false, canDelete: false };
}

// Minimal JWT-like HMAC token
const base64url = (input: Buffer | string) => Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const fromBase64url = (input: string) => Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export const InvitationTokenPayloadSchema = z.object({
  jti: z.string(),
  sub: z.string().uuid().optional(), // recipient hint (if known)
  inviterId: z.string(),
  listId: z.string().uuid().optional(),
  invitationType: z.enum(["connection", "list"]),
  role: InvitationRoleSchema.optional(),
  iat: z.number(),
  exp: z.number(),
});
export type InvitationTokenPayload = z.infer<typeof InvitationTokenPayloadSchema>;

function getSecret() {
  return process.env.INVITE_SECRET || process.env.SESSION_SECRET || "dev-secret";
}

export function signInvitationToken(payload: InvitationTokenPayload): string {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64");
  const sigB64 = sig.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sigB64}`;
}

export function verifyInvitationToken(token: string): InvitationTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("INVALID_TOKEN");
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(data).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) {
    throw new Error("INVALID_SIGNATURE");
  }
  const json = JSON.parse(fromBase64url(payloadB64).toString("utf8"));
  const payload = InvitationTokenPayloadSchema.parse(json);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error("TOKEN_EXPIRED");
  return payload;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();

  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    const arr = this.hits.get(key) || [];
    const recent = arr.filter((ts) => ts > windowStart);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

export class IdempotencyStore {
  private entries = new Map<string, number>();

  constructor(private defaultTtlMs = 10 * 60 * 1000) {}

  add(key: string, ttlMs?: number) {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.entries.set(key, expiresAt);
  }

  has(key: string): boolean {
    const exp = this.entries.get(key);
    if (!exp) return false;
    if (exp <= Date.now()) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }
}

export const globalRateLimiter = new RateLimiter();
export const globalIdempotencyStore = new IdempotencyStore();