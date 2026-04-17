alter table public.documents
  add column if not exists issue_no_edit_history text not null default '';
