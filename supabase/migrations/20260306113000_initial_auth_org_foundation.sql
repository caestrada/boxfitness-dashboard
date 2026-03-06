create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_blank check (email is null or btrim(email) <> '')
);

create unique index profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by_user_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint organizations_name_length check (char_length(btrim(name)) between 2 and 120),
  constraint organizations_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create unique index organizations_slug_unique_idx on public.organizations (slug);
create index organizations_created_by_user_id_idx
  on public.organizations (created_by_user_id);

create table public.organization_members (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'owner',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_role_check check (role in ('owner', 'admin', 'staff')),
  constraint organization_members_status_check check (status in ('active', 'invited', 'suspended')),
  constraint organization_members_unique_user_per_org unique (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);
create index organization_members_org_role_status_idx
  on public.organization_members (organization_id, role, status);

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.prevent_organization_without_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_another_active_owner boolean;
begin
  if tg_op = 'DELETE' then
    if old.role <> 'owner' or old.status <> 'active' then
      return old;
    end if;

    select exists (
      select 1
      from public.organization_members as organization_member
      where organization_member.organization_id = old.organization_id
        and organization_member.id <> old.id
        and organization_member.role = 'owner'
        and organization_member.status = 'active'
    )
    into has_another_active_owner;

    if not has_another_active_owner then
      raise exception 'Each organization must keep at least one active owner.';
    end if;

    return old;
  end if;

  if old.role = 'owner'
     and old.status = 'active'
     and (new.role <> 'owner' or new.status <> 'active') then
    select exists (
      select 1
      from public.organization_members as organization_member
      where organization_member.organization_id = old.organization_id
        and organization_member.id <> old.id
        and organization_member.role = 'owner'
        and organization_member.status = 'active'
    )
    into has_another_active_owner;

    if not has_another_active_owner then
      raise exception 'Each organization must keep at least one active owner.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members as organization_member
    where organization_member.organization_id = target_organization_id
      and organization_member.user_id = auth.uid()
      and organization_member.status = 'active'
  );
$$;

create or replace function private.can_edit_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members as organization_member
    where organization_member.organization_id = target_organization_id
      and organization_member.user_id = auth.uid()
      and organization_member.role in ('owner', 'admin')
      and organization_member.status = 'active'
  );
$$;

create or replace function private.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members as organization_member
    where organization_member.organization_id = target_organization_id
      and organization_member.user_id = auth.uid()
      and organization_member.role = 'owner'
      and organization_member.status = 'active'
  );
$$;

create or replace function private.organization_has_no_members(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.organization_members as organization_member
    where organization_member.organization_id = target_organization_id
  );
$$;

create or replace function private.organization_is_created_by_current_user(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations as organization
    where organization.id = target_organization_id
      and organization.created_by_user_id = auth.uid()
  );
$$;

revoke all on function private.is_organization_member(uuid) from public;
revoke all on function private.can_edit_organization(uuid) from public;
revoke all on function private.is_organization_owner(uuid) from public;
revoke all on function private.organization_has_no_members(uuid) from public;
revoke all on function private.organization_is_created_by_current_user(uuid) from public;

grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.can_edit_organization(uuid) to authenticated;
grant execute on function private.is_organization_owner(uuid) to authenticated;
grant execute on function private.organization_has_no_members(uuid) to authenticated;
grant execute on function private.organization_is_created_by_current_user(uuid) to authenticated;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists set_organization_members_updated_at on public.organization_members;
create trigger set_organization_members_updated_at
before update on public.organization_members
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_profile_from_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_profile_from_auth_user();

drop trigger if exists ensure_active_owner_on_membership_change on public.organization_members;
create trigger ensure_active_owner_on_membership_change
before delete or update of role, status on public.organization_members
for each row
execute function public.prevent_organization_without_owner();

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant select, insert, delete on public.organizations to authenticated;
grant update (name, slug, archived_at) on public.organizations to authenticated;
grant select, insert, delete on public.organization_members to authenticated;
grant update (role, status) on public.organization_members to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "organizations_select_member_orgs"
on public.organizations
for select
to authenticated
using (private.is_organization_member(id));

create policy "organizations_insert_creator"
on public.organizations
for insert
to authenticated
with check (created_by_user_id = auth.uid());

create policy "organizations_update_admin_or_owner"
on public.organizations
for update
to authenticated
using (private.can_edit_organization(id))
with check (private.can_edit_organization(id));

create policy "organizations_delete_owner"
on public.organizations
for delete
to authenticated
using (private.is_organization_owner(id));

create policy "organization_members_select_org_members"
on public.organization_members
for select
to authenticated
using (private.is_organization_member(organization_id));

create policy "organization_members_insert_owner_bootstrap_or_owner_manage"
on public.organization_members
for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and role = 'owner'
    and status = 'active'
    and private.organization_is_created_by_current_user(organization_id)
    and private.organization_has_no_members(organization_id)
  )
  or private.is_organization_owner(organization_id)
);

create policy "organization_members_update_owner_only"
on public.organization_members
for update
to authenticated
using (private.is_organization_owner(organization_id))
with check (private.is_organization_owner(organization_id));

create policy "organization_members_delete_owner_only"
on public.organization_members
for delete
to authenticated
using (private.is_organization_owner(organization_id));
