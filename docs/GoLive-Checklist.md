### Go-Live Checklist

- **Env vars present and documented**: DONE
  - Files: `.env.example` lists all required keys (server, auth, Stripe, invite secret, Vercel)
  - Action: Create `.env` in deployment with strong values; store in secret manager (Vercel/ENV)
  - Verify: `cat .env.example`

- **DB migrations applied**: PENDING
  - Action: Apply schema to the target DB
    - Commands:
      - `npm run db:push` (Drizzle schema -> DB)
      - Seed (optional): `npm run db:seed`
  - Verify: Can create/read lists; tables exist

- **Auth secrets rotated**: PENDING
  - Keys: `SESSION_SECRET`, `INVITE_SECRET`, OIDC client/secret (if used), `RESEND_API_KEY`, `TWILIO_*`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Action: Rotate and store in env; remove old values; audit logs
  - Verify: Login works; invitations tokens verify; webhooks validate signature

- **CORS, headers, CSP set**: PENDING
  - Action: Add CORS + security headers (helmet) in `server/index.ts`
    - CORS: restrict to your domain(s)
    - CSP: `default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'` (tighten per assets)
  - Verify: Inspect response headers; attempt cross-origin call from untrusted origin

- **Rate limiting and input validation enabled**: PARTIAL
  - Validation: Zod schemas used throughout routes (DONE)
  - Rate limits: Invitation create/accept endpoints limited (DONE); add global per-IP limiter for `/api/*` (TODO)
  - Action: Introduce global limiter (e.g., 100 req/5m/IP) and sensitive route caps
  - Verify: Bursts are throttled; invite creation cannot be spammed

- **404/500 pages exist**: PARTIAL
  - 404: Client `pages/not-found.tsx` (DONE)
  - 500: API JSON errors via central handler (DONE). SPA friendly error page (TODO)
  - Action: Add a simple client error page and route fallback if needed
  - Verify: Navigate to unknown route; simulate server error and confirm UX

- **Robots.txt, sitemap if public pages**: PENDING
  - Action: Add `client/public/robots.txt` and `sitemap.xml` (Vite copies to `dist/public`)
  - Verify: `GET /robots.txt` returns content; sitemap valid

- **Backup/restore notes**: PENDING
  - For Postgres:
    - Backup: `pg_dump --format=custom "$DATABASE_URL" > backup.dump`
    - Restore: `pg_restore --clean --no-owner --dbname "$DATABASE_URL" backup.dump`
  - Managed DB (e.g., Neon): enable automated backups and PITR
  - Verify: Perform test restore to staging

### Current Verification Snapshots
- Tests: unit suites passing (guards/invitations/webhooks). Integration suite runs when `DATABASE_URL` is set.
- Build: `vite build` succeeds; code-splitting enabled; bundle size ~508 KB (vendor ~358 KB gzip 114 KB).
- Webhooks: Endpoint `/api/webhooks/stripe` present; signature verification TODO for production.

### Recommended Next Actions Before Go-Live
- Add CORS + Helmet with CSP; implement global rate limiting middleware.
- Add `client/public/robots.txt` and optional `sitemap.xml`.
- Create SPA 500 error page.
- Apply DB schema (`npm run db:push`) to production DB; run seed if needed.
- Rotate and store all secrets; enable webhook signature verification with Stripe.