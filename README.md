# Box Fitness Dashboard

Greenfield Box Fitness dashboard rebuilt from scratch as a standalone Next.js
app.

This repository is intentionally separate from the deprecated dashboard. The
old app can be used for product reference, but the architecture in this repo is
new and optimized around current Next.js App Router patterns and a fresh cloud
Supabase project.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.local.example .env.local
```

3. Add your Supabase cloud credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_your-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_STARTER_PRICE_ID=price_your_starter_price
STRIPE_PRO_PRICE_ID=price_your_pro_price
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only and is used by the Stripe webhook route to
sync organization subscription state back into Supabase.
`STRIPE_STARTER_PRICE_ID` and `STRIPE_PRO_PRICE_ID` should usually be recurring
`price_...` IDs. A `prod_...` product ID is also accepted if that product has a
default recurring price or exactly one active recurring price.

4. Configure Supabase Auth URLs:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- your production URL plus `/auth/callback`

5. Decide whether to disable email confirmation in development:

- With confirm email on, signup does not return a session immediately.
- With confirm email off, signup returns a session and signs the user in.
- The current auth action supports either flow.

6. Apply the Supabase migrations in `supabase/migrations/` to provision the auth,
   organization, profile avatar storage, and organization billing foundation in
   your cloud project.

7. If you want Stripe billing enabled locally, configure a webhook endpoint that
   points at `http://localhost:3000/api/billing/webhooks/stripe` and copy the
   resulting signing secret into `STRIPE_WEBHOOK_SECRET`.

8. Configure Stripe Customer Portal for plan changes:

- Enable subscription updates for the Starter and Pro prices.
- Enable subscription cancellation if Free should remain "no Stripe subscription."
- Configure your portal so upgrades apply immediately and downgrades or
  cancellations take effect at period end if that is your intended billing policy.

9. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Current Foundation

- Next.js 16 App Router with TypeScript and Tailwind CSS v4
- shadcn/ui (New York style, zinc base color)
- Supabase SSR helpers for browser, server, and proxy usage
- First-pass Supabase schema for `profiles`, `organizations`, and
  `organization_members` with RLS
- Gym-scoped members directory foundation with `members` plus
  `member_organizations` tables, a transactional member-creation RPC, and
  RLS-aligned workspace reads
- TanStack React Query provider and Sonner toaster wiring
- Light-first default theme with an optional dark mode toggle in profile settings
- Profile editing supports full-name updates plus avatar uploads and removal,
  backed by a `profile-avatars` Supabase Storage bucket
- Organization-aware dashboard shell with a shadcn sidebar, gym switcher, and
  user avatar menu, with the active workspace resolved from the saved default
  gym on the profile
- Organization-scoped billing in Account Settings, backed by Stripe Checkout,
  in-app plan management for renewal and cancellation, duplicate-checkout guards
  keyed to the workspace's Stripe customer/subscription, scheduled-cancellation
  renewal from the profile page, profile-page reconciliation against Stripe, and
  Stripe webhook sync into Supabase
- Starter routes:
  - `/`
  - `/auth`
  - `/auth/callback`
  - `/dashboard`
  - `/dashboard/members`
  - `/dashboard/members/new`
  - `/dashboard/gyms/new`
  - `/dashboard/profile`
  - `/api/billing/cancel`
  - `/api/billing/checkout`
  - `/api/billing/portal`
  - `/api/billing/renew`
  - `/api/billing/webhooks/stripe`

## Learn More

Primary references for the foundation:

- [Next.js Proxy docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [shadcn/ui docs](https://ui.shadcn.com/docs)

## Validation

```bash
npx tsc --noEmit
npm run lint
npm run build
```
