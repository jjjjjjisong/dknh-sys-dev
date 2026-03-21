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
  updated_by text not null default '',
  constraint accounts_role_check check (role in ('admin', 'user')),
  constraint accounts_del_yn_check check (del_yn in ('Y', 'N'))
);

create index if not exists idx_accounts_name on public.accounts (name);
create index if not exists idx_accounts_role on public.accounts (role);
create index if not exists idx_accounts_del_yn on public.accounts (del_yn);
create index if not exists idx_accounts_updated_at on public.accounts (updated_at desc);

insert into public.accounts (id, password, name, rank, tel, email, role, updated_by)
values
  ('admin', 'dkh2025!', '관리자', '', '', '', 'admin', 'system'),
  ('user1', 'dkh1234', '사용자1', '', '', '', 'user', 'system'),
  ('user2', 'dkh1234', '사용자2', '', '', '', 'user', 'system'),
  ('user3', 'dkh1234', '사용자3', '', '', '', 'user', 'system')
on conflict (id) do nothing;
