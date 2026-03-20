import { getSupabaseClient } from './supabase/client';
import type { OrderBookEntry, OrderBookInput } from '../types/order-book';

export async function fetchOrderBook(): Promise<OrderBookEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .select('id, doc_id, issue_no, date, deadline, client, product, qty, note, receipt, cancelled, from_doc, created_at')
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
    cancelled: row.cancelled ?? false,
    fromDoc: row.from_doc ?? false,
    createdAt: row.created_at ?? null,
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
      cancelled: payload.cancelled,
      from_doc: false,
    })
    .select('id, doc_id, issue_no, date, deadline, client, product, qty, note, receipt, cancelled, from_doc, created_at')
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
      cancelled: payload.cancelled,
    })
    .eq('id', id)
    .select('id, doc_id, issue_no, date, deadline, client, product, qty, note, receipt, cancelled, from_doc, created_at')
    .single();

  if (error) {
    throw error;
  }

  return mapOrderBookRow(data);
}

export async function removeOrderBookEntry(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('order_book').delete().eq('id', id);

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
    cancelled: row.cancelled ?? false,
    fromDoc: row.from_doc ?? false,
    createdAt: row.created_at ?? null,
  };
}
