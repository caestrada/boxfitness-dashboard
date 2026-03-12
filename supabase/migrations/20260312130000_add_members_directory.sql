create table public.members (
  id uuid primary key default extensions.gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_full_name_length check (char_length(btrim(full_name)) between 2 and 160),
  constraint members_email_not_blank check (email is null or btrim(email) <> ''),
  constraint members_phone_not_blank check (phone is null or btrim(phone) <> '')
);

create table public.member_organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null default 'active',
  membership_plan text,
  joined_at date not null default current_date,
  last_visit_at timestamptz,
  outstanding_balance_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_organizations_status_check
    check (status in ('lead', 'active', 'frozen', 'inactive')),
  constraint member_organizations_membership_plan_not_blank
    check (membership_plan is null or btrim(membership_plan) <> ''),
  constraint member_organizations_outstanding_balance_cents_check
    check (outstanding_balance_cents >= 0),
  constraint member_organizations_unique_member_per_org unique (organization_id, member_id)
);

create index members_full_name_idx
  on public.members (full_name);

create index member_organizations_member_id_idx
  on public.member_organizations (member_id);

create index member_organizations_org_status_idx
  on public.member_organizations (organization_id, status);

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

drop trigger if exists set_member_organizations_updated_at on public.member_organizations;
create trigger set_member_organizations_updated_at
before update on public.member_organizations
for each row
execute function public.set_updated_at();

grant select on public.members to authenticated;
grant select, insert, update, delete on public.member_organizations to authenticated;

alter table public.members enable row level security;
alter table public.member_organizations enable row level security;

create policy "members_select_visible_org_members"
on public.members
for select
to authenticated
using (
  exists (
    select 1
    from public.member_organizations as member_organization
    where member_organization.member_id = members.id
      and private.is_organization_member(member_organization.organization_id)
  )
);

create policy "member_organizations_select_org_members"
on public.member_organizations
for select
to authenticated
using (private.is_organization_member(organization_id));

create policy "member_organizations_insert_admin_or_owner"
on public.member_organizations
for insert
to authenticated
with check (private.can_edit_organization(organization_id));

create policy "member_organizations_update_admin_or_owner"
on public.member_organizations
for update
to authenticated
using (private.can_edit_organization(organization_id))
with check (private.can_edit_organization(organization_id));

create policy "member_organizations_delete_admin_or_owner"
on public.member_organizations
for delete
to authenticated
using (private.can_edit_organization(organization_id));
