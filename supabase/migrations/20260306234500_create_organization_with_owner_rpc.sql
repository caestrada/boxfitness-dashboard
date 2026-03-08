create or replace function public.create_organization_with_owner(
  organization_name_input text,
  organization_slug_input text
)
returns table (
  id uuid,
  slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_organization public.organizations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  insert into public.organizations (
    name,
    slug,
    created_by_user_id
  )
  values (
    organization_name_input,
    organization_slug_input,
    current_user_id
  )
  returning *
  into inserted_organization;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  values (
    inserted_organization.id,
    current_user_id,
    'owner',
    'active'
  );

  return query
  select inserted_organization.id, inserted_organization.slug;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text) from public;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;
