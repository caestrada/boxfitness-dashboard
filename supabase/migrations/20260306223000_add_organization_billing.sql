alter table public.organizations
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

alter table public.organizations
  drop constraint if exists organizations_subscription_tier_check;

alter table public.organizations
  add constraint organizations_subscription_tier_check
  check (subscription_tier in ('free', 'starter', 'pro'));

alter table public.organizations
  drop constraint if exists organizations_subscription_status_check;

alter table public.organizations
  add constraint organizations_subscription_status_check
  check (
    subscription_status in (
      'inactive',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'paused'
    )
  );

create unique index if not exists organizations_stripe_customer_id_unique_idx
  on public.organizations (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists organizations_stripe_subscription_id_unique_idx
  on public.organizations (stripe_subscription_id)
  where stripe_subscription_id is not null;
