create table public.memberships (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users(id) on delete cascade,
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  branch_id  uuid        references public.branches(id) on delete set null,
  role       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memberships_org_id_idx    on public.memberships (org_id);
create index memberships_branch_id_idx on public.memberships (branch_id);

create trigger set_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();
