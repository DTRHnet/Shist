import type { Request, Response } from 'express';
import { storage } from './storage';

export async function handleStripeWebhook(req: Request, res: Response) {
  // In production, verify signature from req.headers['stripe-signature'] with Stripe SDK.
  const event = req.body as any;

  try {
    switch (event.type) {
      case 'customer.created': {
        const customer = event.data.object;
        const userId = (customer.metadata && customer.metadata.userId) || undefined;
        if (userId) {
          await storage.upsertCustomer(userId, customer.id);
        }
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        await storage.updateSubscriptionByCustomer(customerId, {
          subscriptionId,
          status: 'active',
          priceId: session?.metadata?.priceId,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await storage.updateSubscriptionByCustomer(sub.customer, {
          subscriptionId: sub.id,
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null as any,
          priceId: sub.items?.data?.[0]?.price?.id,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await storage.updateSubscriptionByCustomer(sub.customer, {
          status: 'canceled',
          cancelAtPeriodEnd: false,
        });
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook error', e);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Webhook processing failed' } });
  }
}