### Billing and Ad Removal

This app supports an "Ad-free" subscription plan. By default, ads are shown; users can opt into ad removal via Stripe.

### Plan

- **Ad-free**: Removes ads across the app while active.
- Detection: `user.isAdFree = user.adPreference === 'hide' OR subscription.status in {active, trialing}`.

### Webhook Events

Handled at `/api/webhooks/stripe` (raw JSON):
- **customer.created**: Upserts Stripe customer, maps to `userId` via `metadata.userId`.
- **checkout.session.completed**: Marks subscription active for the customer; records `subscriptionId`, optional `priceId`.
- **customer.subscription.updated**: Updates status (`active`, `trialing`, `past_due`, `canceled`, etc.), `cancelAtPeriodEnd`, and `currentPeriodEnd`.
- **customer.subscription.deleted**: Marks subscription `canceled`.

Note: In production, verify the webhook signature with Stripe's SDK and secret.

### State Machine

States: `inactive` → `active` ↔ `trialing` → `past_due` → `canceled`
- Enter `active` on checkout completion or subscription update to active/trialing.
- Enter `trialing` on updated/trial start.
- Enter `past_due` on payment issues.
- Enter `canceled` on deletion or cancel.
- `inactive` is default when no subscription.

### Middleware and UI

- On auth endpoints (`/api/auth/user`, `/api/users/me`), `isAdFree` is computed using current subscription and user `adPreference`.
- UI should hide ad components when `isAdFree === true`.
- Users may set `adPreference` to `hide` to temporarily hide ads (feature flag) irrespective of billing.

### Local Testing

- Send sample webhook payloads to `/api/webhooks/stripe` with appropriate `type` and `data.object` fields.
- The handler updates the `subscriptions` table keyed by `customerId` and marks status accordingly.