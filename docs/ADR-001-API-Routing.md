### ADR-001: API Routing Strategy

- Status: Accepted
- Date: 2025-08-22
- Decision Owner: Shist Team

### Context

Shist must deploy on Vercel with a hard cap of ≤12 serverless functions (ideally 1–4). The current repo already uses an Express app (`server/index.ts` + `server/routes.ts`) and Drizzle ORM with Neon Postgres. We also need:
- Auth via email and SMS (Auth.js Core + Resend + Twilio/MessageBird)
- Invitations via email/SMS
- Lists and list items with roles/permissions and public/private sharing
- Stripe subscription for ad removal
- No background jobs beyond Vercel Cron

WebSockets are not supported on Vercel Node functions, so real-time should use SSE or polling. Minimizing function count and cold starts is a priority.

### Options Considered

1) Single tRPC handler at `/api/trpc` (single function)
- Pros: Typed end-to-end procedures, compact runtime
- Cons: Requires adopting tRPC and migrating all REST endpoints and clients; more churn now

2) Single Hono/Express-style router at `/api/*` (1–4 functions by segment)
- Pros: Reuses current Express router; minimal refactor; can be a single function; straightforward to add Auth.js/Stripe/Resend/Twilio
- Cons: Express has slightly higher overhead than Hono; must handle Stripe raw body carefully inside the same app

3) Consolidated REST with METHOD switching per resource (≤8 functions)
- Pros: Clear separation by resource/function; can keep REST semantics
- Cons: More functions to manage; more cold starts and config surface; not necessary given our current unified router

### Decision

Adopt Option 2 with a single Express router mounted under `/api/*`, deployed as one Vercel serverless function.

- Rationale: This minimizes file count and cold starts, aligns with the existing codebase (Express already in place), and keeps changes small. Hono would reduce overhead marginally, but the migration cost outweighs the benefit. tRPC would add the most churn for limited short-term gain.
- Scope: Keep all REST endpoints in one function, including Auth.js, Invitations, Categories, Lists/Items, Billing (Stripe), and Cron-triggered operations. Replace WebSockets with SSE or client polling.

### Trade-offs

- Express vs Hono: Express is slightly heavier, but zero migration risk here. Hono could be a future optimization if needed.
- Single function vs multi-function: Single function simplifies routing and eliminates cross-function latency/cold starts, but requires careful middleware ordering (e.g., Stripe raw-body verification) and route composition.
- WebSockets: Not viable on Vercel functions; use SSE/polling or a managed realtime service. We’ll use SSE/polling to stay within the single-function constraint.

### Function Budget

| Area | Target Functions | Current Functions | Delta |
| --- | ---: | ---: | ---: |
| API Router (`/api/*`) | 1 | 1 (intended via `dist/index.js`) | 0 |
| Auth.js (email+SMS) | 0 (inside API) | 0 | 0 |
| Stripe Webhook | 0 (inside API) | 0 | 0 |
| Cron (invitation cleanup) | 0 (hits API route) | 0 | 0 |
| Static Assets | 0 (static hosting) | 0 | 0 |
| Total | 1 | 1 | 0 |

Notes:
- Stripe webhook will be implemented as a route within the single Express function (raw body handling in that route only).
- Vercel Cron will call an API route (`POST /api/invitations/cleanup`).

### Feature → Route/Procedure → Method

| Feature | Route/Procedure | Method |
| --- | --- | --- |
| Authenticate via email | `/api/auth/email` (request magic link/OTP) | POST |
| Authenticate via SMS | `/api/auth/sms` (request OTP) | POST |
| Auth callback/session | `/api/auth/callback/*`, `/api/auth/session` | GET/POST |
| Get current user | `/api/auth/user` | GET |
| Logout | `/api/auth/logout` | POST |
| Create list | `/api/lists` | POST |
| List my lists | `/api/lists` | GET |
| Get list details | `/api/lists/:id` | GET |
| Update list (name/description/isPublic) | `/api/lists/:id` | PATCH |
| Delete list | `/api/lists/:id` | DELETE |
| Add participant (permissions) | `/api/lists/:id/participants` | POST |
| Update participant permissions | `/api/lists/:id/participants/:userId` | PATCH |
| Remove participant | `/api/lists/:id/participants/:userId` | DELETE |
| Add list item | `/api/lists/:id/items` | POST |
| Update list item | `/api/lists/:listId/items/:itemId` | PATCH |
| Delete list item | `/api/lists/:listId/items/:itemId` | DELETE |
| Get categories | `/api/categories` | GET |
| Get category by id | `/api/categories/:categoryId` | GET |
| Create category | `/api/categories` | POST |
| Send invitation (connection/list) | `/api/invitations` | POST |
| List invitations (sent/received) | `/api/invitations?direction=sent|received` | GET |
| Accept/decline invitation | `/api/invitations/:token` (body: `{ action: "accept"|"decline" }`) | POST |
| Public invitation info | `/invite/:token` | GET |
| Public list view (isPublic=true) | `/list/:listId` | GET |
| Realtime list updates (SSE) | `/api/lists/:id/events` | GET |
| Billing: create checkout session | `/api/billing/checkout` | POST |
| Billing: customer portal | `/api/billing/portal` | POST |
| Stripe webhook | `/api/webhooks/stripe` (raw body) | POST |
| Cron: invitations cleanup | `/api/invitations/cleanup` | POST |

### Implementation Notes

- Keep one serverless function at `api/index.ts` that exports the existing Express app.
- Order middleware so that the Stripe webhook route receives raw body (e.g., `express.raw({ type: 'application/json' })`) before `express.json()` is applied globally.
- Replace the existing WebSocket server with SSE for list updates, or rely on React Query polling to reduce complexity.
- Implement Auth.js Core providers (Email via Resend, SMS via Twilio/MessageBird) and persist sessions in Postgres. Keep `GET /api/auth/user` stable for the client.
- Configure Vercel Cron to call `POST /api/invitations/cleanup` on a daily schedule.
- Ensure `vercel.json` routes all `/api/*` traffic to the single function and serves Vite output (`dist/public`) for the SPA.

### Consequences

- Minimal migration effort; preserves current code style and endpoints.
- Single function reduces cold starts and simplifies deployment/config.
- Stripe, Auth.js, and messaging providers are integrated without increasing function count.
- Realtime is achieved via SSE/polling instead of WebSockets (compatible with Vercel functions).