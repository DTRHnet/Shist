### Auth and Environment Variables

#### Core App URLs
- NEXTAUTH_URL or PUBLIC_APP_URL: Public base URL used in links (invites, auth callbacks)
- APP_ENV: development | preview | production (feature flags/telemetry)

#### Auth Secrets
- AUTH_SECRET: NextAuth/crypto secret (JWT/signing)
- SESSION_SECRET: Express session secret (local/dev sessions)
- AUTH_COOKIE_NAME: Defaults to `shist.session` (server/auth.ts)

#### Database
- DATABASE_URL: Primary Postgres connection string (Drizzle/queries)
- DIRECT_URL: Direct Postgres connection (optional for migrations/admin)

#### Email (Resend)
- RESEND_API_KEY: Email sending
- EMAIL_FROM: From header, e.g. `"Shist <noreply@example.com>"`

#### SMS (Twilio)
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN: API credentials
- TWILIO_MESSAGING_SERVICE_SID: Messaging service (optional)
- TWILIO_FROM_NUMBER: Fallback from number (optional)
- SMS_TEST_CODE: Local test code for SMS auth flow (auth.ts)

#### Stripe (Billing)
- STRIPE_SECRET_KEY: Server-side Stripe API key
- STRIPE_WEBHOOK_SECRET: Verify webhook signatures in `/api/webhooks/stripe`

#### Invitations / Sharing
- INVITE_SECRET: HMAC signing secret for invitation tokens (server/invitationsUtil.ts)

#### Ads (optional)
- AD_SENSE_CLIENT_ID: Google AdSense client id
- GAM_NETWORK_CODE: Google Ad Manager network code

#### CORS / Platform
- CORS_ORIGIN: CSV of allowed origins (server/index.ts CORS config)
- VERCEL: Set by Vercel env automatically

### Where they are used
- server/index.ts: `helmet`, `cors` (CSP + CORS), rate-limiter
- server/routes.ts: all API endpoints; `/api/webhooks/stripe`
- server/stripeWebhooks.ts: `STRIPE_WEBHOOK_SECRET` verification placeholder
- server/invitationsUtil.ts: `INVITE_SECRET` token signing
- server/auth.ts: `AUTH_SECRET`, email/SMS (Resend/Twilio)
- scripts/post-deploy.ts: requires `DATABASE_URL`

### Notes
- Set `NEXTAUTH_URL` or `PUBLIC_APP_URL` to your public domain
- Keep `AUTH_SECRET`, `SESSION_SECRET`, and `INVITE_SECRET` high-entropy
- In production, enable Stripe webhook signature verification