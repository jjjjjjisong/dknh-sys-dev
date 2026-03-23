create table if not exists public.accounts (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  password text not null,
  name text not null,
  rank text not null default '',
  department text not null default '',
  position text not null default '',
  job_title text not null default '',
  manager_id text null,
  tel text not null default '',
  email text not null default '',
  role text not null default 'user',
  can_approve boolean not null default false,
  approval_limit numeric null,
  del_yn text not null default 'N',
  updated_by text not null default ''
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_role_check'
  ) then
    alter table public.accounts
      add constraint accounts_role_check
      check (role in ('admin', 'user'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'accounts_del_yn_check'
  ) then
    alter table public.accounts
      add constraint accounts_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'accounts_manager_id_fkey'
  ) then
    alter table public.accounts
      add constraint accounts_manager_id_fkey
      foreign key (manager_id) references public.accounts(id);
  end if;
end
$$;

create index if not exists idx_accounts_name on public.accounts (name);
create index if not exists idx_accounts_role on public.accounts (role);
create index if not exists idx_accounts_department on public.accounts (department);
create index if not exists idx_accounts_manager_id on public.accounts (manager_id);
create index if not exists idx_accounts_can_approve on public.accounts (can_approve);
create index if not exists idx_accounts_del_yn on public.accounts (del_yn);
create index if not exists idx_accounts_updated_at on public.accounts (updated_at desc);

insert into public.accounts (
  id, password, name, rank, department, position, job_title, manager_id, tel, email, role, can_approve, approval_limit, updated_by
)
values (
  'admin', 'dkh2025!', '관리자', '', '', '', '', null, '', '', 'admin', true, null, 'system'
)
on conflict (id) do nothing;
