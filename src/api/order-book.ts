import { getSupabaseClient } from './supabase/client';
import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import type {
  OrderBookEntry,
  OrderBookInput,
  OrderBookShippingStatus,
  OrderBookStatus,
} from '../types/order-book';

type OrderBookRow = {
  id: string;
  doc_id: string | null;
  document_item_id: string | null;
  issue_no: string | null;
  date: string | null;
  deadline: string | null;
  client: string | null;
  product: string | null;
  qty: number | null;
  note: string | null;
  receipt: string | null;
  status: string | null;
  shipped_status: string | null;
  from_doc: boolean | null;
  created_at: string | null;
  del_yn: 'Y' | 'N' | null;
  updated_at: string | null;
  updated_by: string | null;
};

type DocumentLookupRow = {
  id: string;
  issue_no: string | null;
  order_date: string | null;
  arrive_date: string | null;
  receiver: string | null;
  author: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentItemLookupRow = {
  id: string;
  document_id: string;
  seq: number | null;
  name1: string | null;
  name2: string | null;
  arrive_date: string | null;
  qty: number | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  custom_pallet: number | null;
  custom_box: number | null;
  del_yn: 'Y' | 'N' | null;
};

const ORDER_BOOK_SELECT =
  'id, doc_id, document_item_id, issue_no, date, deadline, client, product, qty, note, receipt, status, shipped_status, from_doc, created_at, del_yn, updated_at, updated_by';

export async function fetchOrderBook(): Promise<OrderBookEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .select(ORDER_BOOK_SELECT)
    .eq('del_yn', 'N')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as OrderBookRow[];
  const docIds = Array.from(new Set(rows.map((row) => row.doc_id).filter((value): value is string => Boolean(value))));
  const [documentsById, itemsByDocId] = await Promise.all([
    fetchDocumentsByIds(docIds),
    fetchDocumentItemsByDocIds(docIds),
  ]);

  return rows.map((row) => mapOrderBookRow(row, documentsById, itemsByDocId));
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
      shipped_status: payload.shippedStatus,
      from_doc: false,
      ...getActiveAuditFields(),
    })
    .select(ORDER_BOOK_SELECT)
    .single();

  if (error) throw error;

  return mapOrderBookRow(data as OrderBookRow, new Map(), new Map());
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
      shipped_status: payload.shippedStatus,
      ...getActiveAuditFields(),
    })
    .eq('id', id)
    .select(ORDER_BOOK_SELECT)
    .single();

  if (error) throw error;

  return mapOrderBookRow(data as OrderBookRow, new Map(), new Map());
}

export async function removeOrderBookEntry(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('order_book').update(getDeletedAuditFields()).eq('id', id);
  if (error) throw error;
}

export async function updateOrderBookShippedStatus(id: string, shippedStatus: OrderBookShippingStatus) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('order_book')
    .update({
      shipped_status: shippedStatus,
      ...getActiveAuditFields(),
    })
    .eq('id', id)
    .select(ORDER_BOOK_SELECT)
    .single();

  if (error) throw error;

  return mapOrderBookRow(data as OrderBookRow, new Map(), new Map());
}

export async function updateManyOrderBookShippedStatus(ids: string[], shippedStatus: OrderBookShippingStatus) {
  if (ids.length === 0) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('order_book')
    .update({
      shipped_status: shippedStatus,
      ...getActiveAuditFields(),
    })
    .in('id', ids)
    .eq('del_yn', 'N');

  if (error) throw error;
}

async function fetchDocumentsByIds(ids: string[]) {
  const lookup = new Map<string, DocumentLookupRow>();
  if (ids.length === 0) return lookup;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, issue_no, order_date, arrive_date, receiver, author, updated_at, created_at')
    .in('id', ids)
    .eq('del_yn', 'N');

  if (error) throw error;

  for (const row of (data ?? []) as DocumentLookupRow[]) {
    lookup.set(row.id, row);
  }

  return lookup;
}

async function fetchDocumentItemsByDocIds(ids: string[]) {
  const lookup = new Map<string, DocumentItemLookupRow[]>();
  if (ids.length === 0) return lookup;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('document_items')
    .select('id, document_id, seq, name1, name2, arrive_date, qty, ea_per_b, box_per_p, custom_pallet, custom_box, del_yn')
    .in('document_id', ids)
    .eq('del_yn', 'N');

  if (error) throw error;

  for (const row of (data ?? []) as DocumentItemLookupRow[]) {
    const current = lookup.get(row.document_id) ?? [];
    current.push(row);
    lookup.set(row.document_id, current);
  }

  return lookup;
}

function mapOrderBookRow(
  row: OrderBookRow,
  documentsById: Map<string, DocumentLookupRow>,
  itemsByDocId: Map<string, DocumentItemLookupRow[]>,
): OrderBookEntry {
  const document = row.doc_id ? documentsById.get(row.doc_id) : undefined;
  const matchedItem = row.doc_id
    ? findMatchingItem(itemsByDocId.get(row.doc_id) ?? [], row.document_item_id, row.product ?? '')
    : undefined;

  return {
    id: String(row.id),
    docId: row.doc_id ? String(row.doc_id) : null,
    documentItemId: row.document_item_id ? String(row.document_item_id) : null,
    issueNo: row.issue_no ?? document?.issue_no ?? '',
    date: document?.order_date ?? row.date ?? null,
    deadline: matchedItem?.arrive_date ?? document?.arrive_date ?? row.deadline ?? null,
    client: row.client ?? '',
    receiver: document?.receiver ?? '',
    product: matchedItem?.name2 || matchedItem?.name1 || row.product || '',
    qty: row.qty ?? matchedItem?.qty ?? 0,
    pallet: getPalletValue(matchedItem),
    box: getBoxValue(matchedItem),
    note: row.note ?? '',
    receipt: row.receipt ?? '',
    status: mapOrderBookStatus(row.status),
    shippedStatus: mapOrderBookShippingStatus(row.shipped_status),
    fromDoc: row.from_doc ?? false,
    author: document?.author ?? row.updated_by ?? '',
    createdAt: row.created_at ?? document?.created_at ?? null,
    delYn: (row.del_yn ?? 'N') as OrderBookEntry['delYn'],
    updatedAt: row.updated_at ?? document?.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

function findMatchingItem(
  items: DocumentItemLookupRow[],
  documentItemId: string | null | undefined,
  productName: string,
) {
  const normalizedDocumentItemId = String(documentItemId ?? '').trim();
  if (normalizedDocumentItemId) {
    const exactItem = items.find((item) => String(item.id) === normalizedDocumentItemId);
    if (exactItem) return exactItem;
  }

  const normalizedProduct = normalizeValue(productName);
  return (
    items.find((item) => normalizeValue(item.name1) === normalizedProduct) ||
    items.find((item) => normalizeValue(item.name2) === normalizedProduct) ||
    (items.length === 1 ? items[0] : undefined)
  );
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getBoxValue(item?: DocumentItemLookupRow) {
  if (!item) return null;
  if (typeof item.custom_box === 'number') return item.custom_box;
  if (typeof item.ea_per_b === 'number') return item.ea_per_b;
  return null;
}

function getPalletValue(item?: DocumentItemLookupRow) {
  if (!item) return null;
  if (typeof item.custom_pallet === 'number') return item.custom_pallet;
  if (typeof item.ea_per_b === 'number' && typeof item.box_per_p === 'number') {
    return item.ea_per_b * item.box_per_p;
  }
  return null;
}

function mapOrderBookShippingStatus(shippedStatus: string | null | undefined): OrderBookShippingStatus {
  return shippedStatus === '출고' ? '출고' : '미출고';
}

function mapOrderBookStatus(status: string | null | undefined): OrderBookStatus {
  if (status === 'ST01') return 'ST01';
  if (status === 'ST00') return 'ST00';
  return 'ST00';
}
