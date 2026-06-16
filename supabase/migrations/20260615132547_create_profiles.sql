create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
