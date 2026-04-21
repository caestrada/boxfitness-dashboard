# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Direction

- This repository is the active greenfield rebuild for Box Fitness.
- The deprecated dashboard repo is reference material only.
- Recreate product workflows intentionally instead of preserving legacy architecture by default.
- Prefer current Next.js App Router patterns, server-first data flows, and clear separation between server and client concerns.
- Default to Supabase cloud projects for development. Do not introduce local Supabase unless Carlos explicitly asks for it later.

## Commands

```bash
npm run dev         # Next.js dev server on http://localhost:3000
npm run build       # Production build
npm run start       # Run the production build
npm run lint        # Biome: lint + format check + import sort
npm run lint -- --fix          # apply safe autofixes
npm run lint -- --fix --unsafe # include unsafe autofixes (review before committing)
npm run format      # biome format --write (format-only, writes to disk)
npm run typecheck   # tsc --noEmit
```

There is no test runner wired up in this repo yet.

## Validation Before Handoff

Run all three and report any failures:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Claude Code Permissions

`.claude/settings.local.json` is committed as the shared Claude Code allowlist for this repo. It pre-approves safe, repeatable commands (`npm run …`, `npx tsc …`, `gh issue|pr|api …`, `jq`, `awk`, `python3`, Supabase read commands, and git inspection commands) so Claude Code does not prompt on every call. Add new entries there — not in personal overrides — when you find yourself approving the same safe command repeatedly.

## Stack Reference

- Next.js 16 (App Router) + React 19 + TypeScript 5, with React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui (New York style, Zinc base color)
- Supabase JS v2 + `@supabase/ssr` for SSR auth; Stripe SDK v20 for billing
- TanStack React Query, TanStack Table, Zod (use `zod/v3` for form schemas), Sonner (toasts), date-fns, lucide-react
- Light-first theme with optional dark mode; primary color `hsl(18 100% 55%)` / `#FF6B2C`
- Path alias: `@/*` → `src/*`

## Architecture

### Routing and auth gating

- Next.js App Router under `src/app/`. The **middleware file is `src/proxy.ts`** (not `middleware.ts`) — it exports `proxy` and wires to `src/lib/supabase/proxy.ts#updateSession`, which refreshes the Supabase session cookies on every request and gates `/dashboard/**` routes: unauthenticated users are redirected to `/auth?redirectTo=...`, and authenticated users hitting `/auth` are bounced to their intended destination.
- `src/app/dashboard/layout.tsx` re-validates the user server-side, loads the profile + gyms, resolves the active gym (`resolveActiveGym` in `src/lib/dashboard.ts`), and renders the sidebar + shell. Every dashboard page should assume a server-resolved `activeGym` is already the current workspace context.

### Three Supabase clients — pick the right one

Defined in `src/lib/supabase/`:

- `client.ts` — browser client (anon/publishable key). Use in Client Components.
- `server.ts` — SSR client using cookies() for the user's session. Use in Server Components, Server Actions, and route handlers where you want RLS to apply as the authenticated user.
- `admin.ts` — **service-role** client (`SUPABASE_SERVICE_ROLE_KEY`). Marked `"server-only"`. Use only for operations that must bypass RLS (Stripe webhook sync, member create/update/delete fallbacks). Guard with `hasSupabaseAdminEnv()` and surface `MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE` when the key is absent.
- `proxy.ts` — middleware-flavored SSR client used only from `src/proxy.ts`.

`src/lib/env.ts` centralizes env access with `hasSupabaseEnv()` / `getSupabaseEnv()` and a user-facing missing-env message. Always gate server actions/routes with the `has*Env()` checks before touching Supabase.

### Server Actions + `useActionState` pattern

Forms use Server Actions (files named `actions.ts` next to the route, e.g. `src/app/dashboard/members/actions.ts`, `src/app/dashboard/actions.ts`, `src/app/dashboard/profile/actions.ts`, `src/app/auth/actions.ts`). Each action:

1. Checks `hasSupabaseEnv()` first.
2. Zod-parses the `FormData` (schemas inline in the action file) and returns a typed `{ status: "error", fieldErrors }` shape on validation failure.
3. Re-validates the session + any org-scoped authorization (see `requireMemberManagementAccess`).
4. Calls `revalidatePath(...)` for affected routes and either returns a success state or `redirect(...)`s.

Action-state types live in sibling files (e.g. `member-action-state.ts`, `gym-action-state.ts`, `default-gym-action-state.ts`) so both the action and the client form can import them.

### RPC-first writes, with admin fallback

Writes that must touch multiple tables atomically go through Postgres RPCs defined in `supabase/migrations/` (e.g. `create_organization_with_owner`, `create_member_with_membership`). When an RPC is missing from the connected project's schema cache, the action falls back to a direct admin-client multi-step insert with manual compensation (see `createMemberDirectly` / `updateMemberDirectly` / `deleteMemberDirectly` in `src/app/dashboard/members/actions.ts`). The fallback exists specifically because the migration may not be applied yet; keep this pattern when adding new multi-table writes.

### Organization (gym) scoping

- `organizations` are gyms; `organization_members` links users (roles: `owner`, `admin`, `staff`; statuses: `active`, `invited`, `suspended`).
- The user's *default* gym is stored on `profiles.default_organization_id`. `resolveActiveGym` falls back to the first gym if no default is saved.
- `members` is a gym-independent person record; `member_organizations` is the per-gym membership (status, plan, joined_at, outstanding balance). Member directory queries always filter by `activeGym.id` and embed `member:members!member_organizations_member_id_fkey(...)`.
- RLS is assumed throughout — avoid using the admin client just to skip RLS. Reserve it for flows where the user truly is not the actor (webhooks, cross-boundary recovery).

### Stripe billing

`src/lib/billing.ts` holds plan definitions + status normalization (pure, client-safe). `src/lib/billing-server.ts` is `"server-only"` and handles the Stripe SDK, webhook secret, price-vs-product ID resolution (accepts either `price_...` or `prod_...` in env), and `synchronizeOrganizationBillingSnapshot` which reconciles the DB row against live Stripe state. Routes live in `src/app/api/billing/`:

- `checkout/` — create checkout session
- `portal/` — Stripe customer portal link
- `cancel/`, `renew/` — in-app cancellation and re-activation
- `webhooks/stripe/` — handles `checkout.session.completed`, `customer.subscription.created|updated|deleted` and writes tier/status back to `organizations` via the admin client

Billing writes update the `organizations` row, so keep subscription fields (`subscription_tier`, `subscription_status`, `subscription_current_period_end`, `subscription_cancel_at_period_end`, `stripe_customer_id`, `stripe_subscription_id`) in sync.

### Component organization

- `src/components/ui/` — shadcn primitives (don't put app logic here)
- `src/components/dashboard/` — dashboard-shell and feature components (sidebar, gym switcher, member actions, billing card)
- `src/components/providers/` — `AppProviders` wires React Query + Theme + Sonner; mounted in the root layout
- `src/components/auth/`, `src/components/setup/` — auth forms and the env-missing setup panel

### Theme

`src/lib/theme.ts` + `src/components/providers/theme-provider.tsx`. The root layout injects a `beforeInteractive` script that reads `themeStorageKey` from `localStorage` and sets `html.dark` / `color-scheme` before paint to avoid FOUC. Theme toggle lives in the profile page.

## Git Workflow

- Keep commits small and focused; messages must be clear and imperative.
- Do not push, open PRs, or merge. Carlos handles all remote git actions.
- Do not amend or rebase existing commits unless explicitly requested.
- Do not revert user changes you did not make.
- Only commit when Carlos explicitly asks.
- Always run `git status` before staging or committing anything.

### Staging Rules

- Never use `git add -A` or `git add .`.
- Stage only files explicitly modified in the current session.
- Always use specific file paths when staging.

## Code Style

- Use clear, descriptive variable names.
- Keep functions small and focused.
- Prefer simplicity over cleverness.
- No quick fixes. Fix TypeScript and code issues properly.
- Use proper TypeScript types instead of `any`.
- Prefer editing existing files over creating new ones unless the new file materially improves structure.

## Documentation

- Update docs when behavior changes.
- Include file paths changed and a short summary of what changed in handoff.
