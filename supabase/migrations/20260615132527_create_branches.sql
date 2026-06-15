create table public.branches (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  code       integer     not null check (code > 0),
  name       text        not null,
  address    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (org_id, code)
);

create index branches_org_id_idx on public.branches (org_id);

create trigger set_branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();
