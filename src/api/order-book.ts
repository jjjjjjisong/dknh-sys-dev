import { getSupabaseClient } from './supabase/client';
import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import type { OrderBookEntry, OrderBookInput, OrderBookStatus } from '../types/order-book';

export async function fetchOrderBook(): Promise<OrderBookEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .select('id, doc_id, issue_no, date, deadline, client, product, qty, note, receipt, status, cancelled, from_doc, created_at, del_yn, updated_at, updated_by')
    .eq('del_yn', 'N')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    docId: row.doc_id ? String(row.doc_id) : null,
    issueNo: row.issue_no ?? '',
    date: row.date ?? null,
    deadline: row.deadline ?? null,
    client: row.client ?? '',
    product: row.product ?? '',
    qty: row.qty ?? 0,
    note: row.note ?? '',
    receipt: row.receipt ?? '',
    status: mapOrderBookStatus(row.status, row.cancelled),
    fromDoc: row.from_doc ?? false,
    createdAt: row.created_at ?? null,
    delYn: (row.del_yn ?? 'N') as OrderBookEntry['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  }));
}

export async function createOrderBookEntry(payload: OrderBookInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .insert({
      issue_no: payload.issueNo,
      date: payload.date,
      deadline: payload.deadline,
      client: payload.client,
      product: payload.product,
      qty: payload.qty,
      note: payload.note,
      receipt: payload.receipt,
      status: payload.status,
      from_doc: false,
      ...getActiveAuditFields(),
    })
    .select('id, doc_id, issue_no, date, deadline, client, product, qty, note, receipt, status, cancelled, from_doc, created_at, del_yn, updated_at, updated_by')
    .single();

  if (error) {
    throw error;
  }

  return mapOrderBookRow(data);
}

export async function updateOrderBookEntry(id: string, payload: OrderBookInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .update({
      issue_no: payload.issueNo,
      date: payload.date,
      deadline: payload.deadline,
      client: payload.client,
      product: payload.product,
      qty: payload.qty,
      note: payload.note,
      receipt: payload.receipt,
      status: payload.status,
      ...getActiveAuditFields(),
    })
    .eq('id', id)
    .select('id, doc_id, issue_no, date, deadline, client, product, qty, note, receipt, status, cancelled, from_doc, created_at, del_yn, updated_at, updated_by')
    .single();

  if (error) {
    throw error;
  }

  return mapOrderBookRow(data);
}

export async function removeOrderBookEntry(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('order_book').update(getDeletedAuditFields()).eq('id', id);

  if (error) {
    throw error;
  }
}

function mapOrderBookRow(row: any): OrderBookEntry {
  return {
    id: String(row.id),
    docId: row.doc_id ? String(row.doc_id) : null,
    issueNo: row.issue_no ?? '',
    date: row.date ?? null,
    deadline: row.deadline ?? null,
    client: row.client ?? '',
    product: row.product ?? '',
    qty: row.qty ?? 0,
    note: row.note ?? '',
    receipt: row.receipt ?? '',
    status: mapOrderBookStatus(row.status, row.cancelled),
    fromDoc: row.from_doc ?? false,
    createdAt: row.created_at ?? null,
    delYn: (row.del_yn ?? 'N') as OrderBookEntry['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

function mapOrderBookStatus(status: string | null | undefined, cancelled?: boolean | null): OrderBookStatus {
  if (status === 'ST01') return 'ST01';
  if (status === 'ST00') return 'ST00';
  return cancelled ? 'ST01' : 'ST00';
}
