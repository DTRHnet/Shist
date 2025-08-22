import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStripeWebhook } from '../stripeWebhooks';

vi.mock('../storage', () => {
  return {
    storage: {
      upsertCustomer: vi.fn().mockResolvedValue({}),
      updateSubscriptionByCustomer: vi.fn().mockResolvedValue({}),
      deleteSubscriptionByCustomer: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { storage } from '../storage';

function makeRes() {
  const res: any = {};
  res.statusCode = 200;
  res.json = vi.fn().mockImplementation((v: any) => v);
  res.status = vi.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  return res;
}

describe('stripe webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles customer.created', async () => {
    const req: any = { body: { type: 'customer.created', data: { object: { id: 'cus_123', metadata: { userId: 'user1' } } } } };
    const res = makeRes();
    await handleStripeWebhook(req as any, res as any);
    expect(storage.upsertCustomer).toHaveBeenCalledWith('user1', 'cus_123');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('handles checkout.session.completed', async () => {
    const req: any = { body: { type: 'checkout.session.completed', data: { object: { customer: 'cus_123', subscription: 'sub_1', metadata: { priceId: 'price_1' } } } } };
    const res = makeRes();
    await handleStripeWebhook(req as any, res as any);
    expect(storage.updateSubscriptionByCustomer).toHaveBeenCalledWith('cus_123', expect.objectContaining({ subscriptionId: 'sub_1', status: 'active', priceId: 'price_1' }));
  });

  it('handles subscription.updated', async () => {
    const req: any = { body: { type: 'customer.subscription.updated', data: { object: { customer: 'cus_123', id: 'sub_1', status: 'trialing', cancel_at_period_end: false, current_period_end: Math.floor(Date.now()/1000) } } } };
    const res = makeRes();
    await handleStripeWebhook(req as any, res as any);
    expect(storage.updateSubscriptionByCustomer).toHaveBeenCalledWith('cus_123', expect.objectContaining({ status: 'trialing' }));
  });

  it('handles subscription.deleted', async () => {
    const req: any = { body: { type: 'customer.subscription.deleted', data: { object: { customer: 'cus_123' } } } };
    const res = makeRes();
    await handleStripeWebhook(req as any, res as any);
    expect(storage.updateSubscriptionByCustomer).toHaveBeenCalledWith('cus_123', expect.objectContaining({ status: 'canceled' }));
  });
});