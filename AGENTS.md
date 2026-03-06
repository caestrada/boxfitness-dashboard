# AGENTS.md

## Project Direction

- This repository is the active greenfield rebuild for Box Fitness.
- The deprecated dashboard repo is reference material only.
- Recreate product workflows intentionally instead of preserving legacy architecture by default.
- Prefer current Next.js App Router patterns, server-first data flows, and clear separation between server and client concerns.
- Default to Supabase cloud projects for development. Do not introduce local Supabase unless Carlos explicitly asks for it later.

## Git Workflow

- Keep commits small and focused.
- Commit messages must be clear and imperative.
- Do not push, open PRs, or merge. Carlos handles all remote git actions.
- Do not amend or rebase existing commits unless explicitly requested.
- Do not revert user changes you did not make.
- Only commit when Carlos explicitly asks.
- Always run `git status` before staging or committing anything.

## Staging Rules

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

## Validation Before Handoff

- Run `npx tsc --noEmit` to verify no type errors.
- Run `npm run lint`.
- Run `npm run build`.
- If any checks fail, report failures clearly in handoff notes.

## Documentation

- Update docs when behavior changes.
- Include file paths changed and a short summary of what changed in handoff.

## Stack Reference

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- shadcn/ui (New York style) with Zinc base color
- Supabase (SSR auth via `@supabase/ssr`)
- TanStack React Query, Zod (`zod/v3` for form schemas), Sonner, date-fns, lucide-react
- Theme system supports both light and dark modes
- Primary color: `hsl(18 100% 55%)` / `#FF6B2C`
