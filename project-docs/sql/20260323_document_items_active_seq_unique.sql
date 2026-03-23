create unique index if not exists uq_document_items_active_document_id_seq
  on public.document_items (document_id, seq)
  where del_yn = 'N';

create unique index if not exists uq_documents_active_issue_no
  on public.documents (issue_no)
  where del_yn = 'N';
