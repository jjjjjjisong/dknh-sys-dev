import { getSupabaseClient } from './supabase/client';
import type { OrderBookEntry } from '../types/order-book';

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
