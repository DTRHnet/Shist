import { nanoid } from 'nanoid';

export function generateInvitationToken(): string {
  return nanoid(32);
}

export function getExpirationDate(): Date {
  // 7 days from now
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}
