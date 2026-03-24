alter table if exists public.document_items
  add column if not exists release_note text not null default '';

alter table if exists public.document_items
  add column if not exists invoice_note text not null default '';

update public.document_items
set
  release_note = case
    when coalesce(release_note, '') = '' then coalesce(item_note, '')
    else release_note
  end,
  invoice_note = case
    when coalesce(invoice_note, '') = '' then coalesce(item_note, '')
    else invoice_note
  end
where coalesce(item_note, '') <> '';
