alter table public.profiles
  add column default_organization_id uuid references public.organizations (id) on delete set null;

create index profiles_default_organization_id_idx
  on public.profiles (default_organization_id);

create or replace function public.prevent_invalid_profile_default_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_active_membership boolean;
begin
  if new.default_organization_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.organization_members as organization_member
    where organization_member.organization_id = new.default_organization_id
      and organization_member.user_id = new.id
      and organization_member.status = 'active'
  )
  into has_active_membership;

  if not has_active_membership then
    raise exception 'Default organization must be an active membership for this user.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_valid_profile_default_organization on public.profiles;
create trigger ensure_valid_profile_default_organization
before insert or update of default_organization_id on public.profiles
for each row
execute function public.prevent_invalid_profile_default_organization();

grant update (default_organization_id) on public.profiles to authenticated;

update public.profiles as profile
set default_organization_id = default_membership.organization_id
from (
  select
    organization_member.user_id,
    min(organization_member.organization_id) as organization_id
  from public.organization_members as organization_member
  where organization_member.status = 'active'
  group by organization_member.user_id
  having count(*) = 1
) as default_membership
where profile.id = default_membership.user_id
  and profile.default_organization_id is null;
