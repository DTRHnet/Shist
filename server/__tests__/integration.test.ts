import { describe, it, expect, vi, beforeEach } from 'vitest';

const SKIP = !process.env.DATABASE_URL;

vi.mock('../invitationService', () => ({
  createInvitationServices: () => ({
    emailService: { sendInvitationEmail: vi.fn().mockResolvedValue(undefined) },
    smsService: { sendInvitationSMS: vi.fn().mockResolvedValue(undefined) },
  }),
  InvitationUtils: {
    generateInvitationToken: () => 'tok_test',
    generateInvitationLink: (t: string, b: string) => `${b}/invite/${t}`,
    getExpirationDate: () => new Date(Date.now() + 7 * 24 * 3600 * 1000),
  },
}));

vi.mock('../stripeWebhooks', () => ({
  handleStripeWebhook: vi.fn().mockResolvedValue(undefined),
}));

function uid() { return Math.random().toString(36).slice(2); }

if (!SKIP) {
  // Import only when DB available
  const { storage } = await import('../storage');
  const { InvitationUtils } = await import('../invitationService');

  describe('integration basics (storage-level)', () => {
    let userId: string;
    beforeEach(async () => {
      userId = `usr_${uid()}`;
      await storage.upsertUser({ id: userId, email: `${userId}@local` });
    });

    it('lists CRUD: create, update, delete', async () => {
      const list = await storage.createList({ name: 'Test', description: 'desc', creatorId: userId, isPublic: false } as any);
      expect(list.id).toBeTruthy();
      const updated = await storage.updateList(list.id, { name: 'New' });
      expect(updated.name).toBe('New');
      await storage.deleteList(list.id);
    });

    it('invitations: create and accept (storage path)', async () => {
      const inviter = userId;
      const list = await storage.createList({ name: 'Share', description: null, creatorId: inviter, isPublic: false } as any);
      const token = InvitationUtils.generateInvitationToken();
      const invite = await storage.createInvitation({ inviterId: inviter, invitationType: 'list', listId: list.id, recipientEmail: 'friend@local', token, status: 'pending', expiresAt: new Date(Date.now()+3600_000) } as any);
      expect(invite.token).toBe(token);
      await storage.updateInvitationStatus(invite.id, 'accepted', new Date());
    });

    it('subscription toggle via storage', async () => {
      await storage.upsertCustomer(userId, 'cus_test');
      const sub = await storage.updateSubscriptionByCustomer('cus_test', { status: 'active' } as any);
      expect(sub.status).toBe('active');
    });
  });
} else {
  describe.skip('integration basics (storage-level)', () => {});
}