create or replace function public.create_member_with_membership(
  organization_id_input uuid,
  full_name_input text,
  email_input text default null,
  phone_input text default null,
  status_input text default 'active',
  membership_plan_input text default null,
  joined_at_input date default current_date,
  outstanding_balance_cents_input integer default 0
)
returns table (
  member_id uuid,
  member_organization_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_member_id uuid;
  inserted_member_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be authenticated to create a member.';
  end if;

  if not private.can_edit_organization(organization_id_input) then
    raise exception 'You do not have permission to add members to this gym.';
  end if;

  insert into public.members (
    full_name,
    email,
    phone
  )
  values (
    btrim(full_name_input),
    nullif(btrim(email_input), ''),
    nullif(btrim(phone_input), '')
  )
  returning id into inserted_member_id;

  insert into public.member_organizations (
    organization_id,
    member_id,
    status,
    membership_plan,
    joined_at,
    outstanding_balance_cents
  )
  values (
    organization_id_input,
    inserted_member_id,
    status_input,
    nullif(btrim(membership_plan_input), ''),
    joined_at_input,
    outstanding_balance_cents_input
  )
  returning id into inserted_member_organization_id;

  return query
  select inserted_member_id, inserted_member_organization_id;
end;
$$;

revoke all on function public.create_member_with_membership(uuid, text, text, text, text, text, date, integer) from public;
grant execute on function public.create_member_with_membership(uuid, text, text, text, text, text, date, integer) to authenticated;
