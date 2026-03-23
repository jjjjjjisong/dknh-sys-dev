create table if not exists public.accounts (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  password text not null,
  name text not null,
  rank text not null default '',
  tel text not null default '',
  email text not null default '',
  role text not null default 'user',
  del_yn text not null default 'N',
  updated_by text not null default ''
);

alter table public.accounts add column if not exists created_at timestamptz not null default now();
alter table public.accounts add column if not exists updated_at timestamptz not null default now();
alter table public.accounts add column if not exists password text;
alter table public.accounts add column if not exists name text;
alter table public.accounts add column if not exists rank text not null default '';
alter table public.accounts add column if not exists tel text not null default '';
alter table public.accounts add column if not exists email text not null default '';
alter table public.accounts add column if not exists role text not null default 'user';
alter table public.accounts add column if not exists del_yn text not null default 'N';
alter table public.accounts add column if not exists updated_by text not null default '';

update public.accounts
set password = coalesce(password, 'dkh1234'),
    name = coalesce(name, id),
    role = case when role is null or role = '' then 'user' else role end,
    del_yn = coalesce(nullif(del_yn, ''), 'N'),
    updated_at = coalesce(updated_at, created_at, now()),
    updated_by = coalesce(nullif(updated_by, ''), 'system')
where password is null
   or name is null
   or role is null
   or role = ''
   or del_yn is null
   or del_yn = ''
   or updated_at is null
   or updated_by is null
   or updated_by = '';

alter table public.accounts alter column password set not null;
alter table public.accounts alter column name set not null;
alter table public.accounts alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_role_check'
  ) then
    alter table public.accounts
      add constraint accounts_role_check
      check (role in ('admin', 'user'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_del_yn_check'
  ) then
    alter table public.accounts
      add constraint accounts_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;
end
$$;

create index if not exists idx_accounts_name on public.accounts (name);
create index if not exists idx_accounts_role on public.accounts (role);
create index if not exists idx_accounts_del_yn on public.accounts (del_yn);
create index if not exists idx_accounts_updated_at on public.accounts (updated_at desc);

insert into public.accounts (id, password, name, rank, tel, email, role)
values
  ('admin', 'dkh2025!', '관리자', '', '', '', 'admin'),
  ('user1', 'dkh1234', '사용자1', '', '', '', 'user'),
  ('user2', 'dkh1234', '사용자2', '', '', '', 'user'),
  ('user3', 'dkh1234', '사용자3', '', '', '', 'user')
on conflict (id) do nothing;

alter table public.accounts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_select_anon'
  ) then
    create policy accounts_select_anon
      on public.accounts
      for select
      to anon
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_insert_anon'
  ) then
    create policy accounts_insert_anon
      on public.accounts
      for insert
      to anon
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_update_anon'
  ) then
    create policy accounts_update_anon
      on public.accounts
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_delete_anon'
  ) then
    create policy accounts_delete_anon
      on public.accounts
      for delete
      to anon
      using (true);
  end if;
end
$$;
