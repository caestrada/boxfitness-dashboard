insert into public.profiles (id, email, full_name, avatar_url)
select
  auth_user.id,
  auth_user.email,
  nullif(
    trim(
      coalesce(
        auth_user.raw_user_meta_data ->> 'full_name',
        auth_user.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  ) as full_name,
  nullif(trim(coalesce(auth_user.raw_user_meta_data ->> 'avatar_url', '')), '') as avatar_url
from auth.users as auth_user
on conflict (id) do update
set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
  updated_at = now();
