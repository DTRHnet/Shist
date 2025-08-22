### Shist

A collaborative list app.

### Database & Migrations

Assumes Vercel Postgres with Prisma.

1) Set environment
- DATABASE_URL=postgres://...

2) Install Prisma
- npm install prisma @prisma/client --save-dev

3) Generate client
- npm run prisma:generate

4) Apply migrations (development)
- npm run prisma:migrate:dev

5) Deploy migrations (production/CI)
- npm run prisma:migrate:deploy

6) Seed (idempotent)
- npm run db:seed

Notes
- Existing tables from Drizzle are mapped in `prisma/schema.prisma` via @@map/@map to minimize churn.
- New tables (profiles, accounts, sessions_auth, verification_tokens, subscriptions, ad_preferences, audit_logs) are created by the initial migration.
- Indexes are added for hot paths (userId, listId, isPublic+updatedAt, updatedAt).
- Vercel Postgres lacks RLS; server-side guards are implemented in `server/rls.ts` and used in routes.