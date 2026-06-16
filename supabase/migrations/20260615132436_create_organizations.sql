-- shared trigger function reused by all tables with updated_at
create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id         uuid        primary key default gen_random_uuid(),
  tax_id     text        not null unique,
  name       text        not null,
  slug       text        not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_tax_id_idx on public.organizations (tax_id);
create index organizations_slug_idx   on public.organizations (slug);

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();
