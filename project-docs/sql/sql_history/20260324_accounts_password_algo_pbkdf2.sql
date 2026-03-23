do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'accounts_password_algo_check'
  ) then
    alter table public.accounts
      drop constraint accounts_password_algo_check;
  end if;

  alter table public.accounts
    add constraint accounts_password_algo_check
    check (password_algo in ('legacy-plain', 'bcrypt', 'pbkdf2-sha256'));
end
$$;
