create sequence if not exists public.clients_id_seq;

alter sequence public.clients_id_seq owned by public.clients.id;

alter table public.clients
  alter column id set default nextval('public.clients_id_seq');

select setval(
  'public.clients_id_seq',
  coalesce((select max(id) from public.clients), 0) + 1,
  false
);
