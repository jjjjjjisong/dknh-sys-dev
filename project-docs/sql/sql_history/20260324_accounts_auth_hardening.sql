alter table public.accounts
  add column if not exists password_hash text null,
  add column if not exists password_algo text not null default 'legacy-plain',
  add column if not exists password_changed_at timestamptz null,
  add column if not exists is_temp_password boolean not null default false,
  add column if not exists login_fail_count integer not null default 0,
  add column if not exists locked_at timestamptz null,
  add column if not exists last_login_at timestamptz null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_password_algo_check'
  ) then
    alter table public.accounts
      add constraint accounts_password_algo_check
      check (password_algo in ('legacy-plain', 'bcrypt'));
  end if;
end
$$;

create index if not exists idx_accounts_password_algo on public.accounts (password_algo);
create index if not exists idx_accounts_locked_at on public.accounts (locked_at);
create index if not exists idx_accounts_last_login_at on public.accounts (last_login_at desc);

update public.accounts
set password_changed_at = coalesce(updated_at, created_at)
where password_changed_at is null
  and coalesce(password, '') <> '';

