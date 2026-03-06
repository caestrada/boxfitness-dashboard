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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Configure Supabase Auth URLs:

- Site URL: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`
- your production URL plus `/auth/callback`

5. Decide whether to disable email confirmation in development:

- With confirm email on, signup does not return a session immediately.
- With confirm email off, signup returns a session and signs the user in.
- The current auth action supports either flow.

6. Apply the first cloud schema migration in your Supabase project from
   `supabase/migrations/20260306113000_initial_auth_org_foundation.sql`.

7. Start the dev server:

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
- TanStack React Query provider and Sonner toaster wiring
- Light-first theme with a softer grayscale shell and orange accent moments
- Organization-aware dashboard shell with a shadcn sidebar, gym switcher, and
  user avatar menu
- Starter routes:
  - `/`
  - `/auth`
  - `/auth/callback`
  - `/dashboard`
  - `/dashboard/gyms/new`

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
