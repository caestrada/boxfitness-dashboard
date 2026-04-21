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
  RLS-aligned workspace reads, member profile pages, and member editing from
  the directory actions menu
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
  - `/dashboard/members/[membershipId]`
  - `/dashboard/members/[membershipId]/edit`
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

## Linting

Lint, format, and import sorting are unified under [Biome](https://biomejs.dev/). Run the default project checks with:

```bash
npm run lint
```

Apply safe automatic fixes with:

```bash
npm run lint -- --fix
```

Use the safe fix command when you want Biome to apply formatting, import sorting, and fixes it considers low risk.

Apply a broader set of fixes, including unsafe fixes, with:

```bash
npm run lint -- --fix --unsafe
```

Use the `--unsafe` variant when you want Biome to make more aggressive changes that may alter behavior and should be reviewed before committing.

## Formatting

Run Biome's formatter directly with:

```bash
npx biome format
```

Use this when you want to check formatting without writing changes to disk.

Write formatting changes to disk with:

```bash
npm run format
```

## Testing

### Unit tests

Unit tests are powered by [Vitest](https://vitest.dev/) + React Testing Library (happy-dom environment). Specs live under `test/unit/`.

```bash
npm run test         # run the unit suite once
npm run test:watch   # re-run on file changes
```

### End-to-end tests

E2E coverage uses [Playwright](https://playwright.dev/) (chromium only, single worker). Specs live under `test/e2e/` and use the `.spec.mts` extension. `playwright.config.mts` boots the production build via `npm run build && npm run start` before the first test.

On first run, install the browser binaries:

```bash
npm run test:e2e:install
```

Then run the suite:

```bash
npm run test:e2e          # headless run
npm run test:e2e:headed   # watch the browser drive the app
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:debug    # step through with the inspector
npm run test:all          # unit + E2E
```

Artifacts (`playwright-report/`, `test-results/`) are gitignored. On CI, traces are captured on first retry and screenshots + videos on failure.

## Validation

```bash
npx tsc --noEmit
npm run lint
npm run build
```
