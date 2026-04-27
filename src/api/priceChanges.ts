import { getAuditActor } from './audit';
import { getSupabaseClient } from './supabase/client';
import { toNullableDbId } from '../utils/dbIds';

export const MANUAL_PRICE_CHANGE_PRODUCT_ID = '__manual__';

export type PriceChangeCriteria = {
  dateFrom: string;
  dateTo: string;
  clientId: string;
  clientName: string;
  receiver: string;
  productId: string;
  productName: string;
};

export type PriceChangePreviewRow = {
  itemId: string;
  documentId: string;
  issueNo: string;
  baseDate: string | null;
  clientId: string | null;
  clientName: string;
  receiver: string;
  productId: string | null;
  productName: string;
  qty: number;
  costPrice: number | null;
  unitPrice: number;
  supply: number;
  vat: boolean;
};

export type PriceChangeLog = {
  id: string;
  changedAt: string | null;
  changedBy: string;
  documentItemId: string | null;
  documentId: string | null;
  issueNo: string;
  baseDate: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  clientId: string | null;
  clientName: string;
  receiver: string;
  productId: string | null;
  productName: string;
  oldCostPrice: number | null;
  newCostPrice: number | null;
  oldUnitPrice: number | null;
  newUnitPrice: number | null;
  changedItemCount: number;
  changedDocumentCount: number;
};

type PriceChangePreviewRowDb = {
  item_id: number | string;
  document_id: string;
  issue_no: string | null;
  base_date: string | null;
  client_id: number | string | null;
  client_name: string | null;
  receiver: string | null;
  product_id: number | string | null;
  product_name: string | null;
  qty: number | null;
  cost_price: number | null;
  unit_price: number | null;
  supply: number | null;
  vat: boolean | null;
};

type PriceChangeLogDb = {
  id: number | string;
  changed_at: string | null;
  changed_by: string | null;
  document_item_id: number | string | null;
  document_id: string | null;
  issue_no: string | null;
  base_date: string | null;
  date_from: string | null;
  date_to: string | null;
  client_id: number | string | null;
  client_name: string | null;
  receiver: string | null;
  product_id: number | string | null;
  product_name: string | null;
  old_cost_price: number | null;
  new_cost_price: number | null;
  old_unit_price: number | null;
  new_unit_price: number | null;
  changed_item_count: number | null;
  changed_document_count: number | null;
};

export async function previewPriceChange(criteria: PriceChangeCriteria): Promise<PriceChangePreviewRow[]> {
  const supabase = getSupabaseClient();
  const manualOnly = criteria.productId === MANUAL_PRICE_CHANGE_PRODUCT_ID;
  const { data, error } = await supabase.rpc('preview_document_item_price_change', {
    p_date_from: toNullableText(criteria.dateFrom),
    p_date_to: toNullableText(criteria.dateTo),
    p_client_id: toNullableDbId(criteria.clientId),
    p_receiver: toNullableText(criteria.receiver),
    p_product_id: manualOnly ? null : toNullableDbId(criteria.productId),
    p_product_name: manualOnly
      ? MANUAL_PRICE_CHANGE_PRODUCT_ID
      : criteria.productId
        ? null
        : toNullableText(criteria.productName),
  });

  if (error) {
    throw toReadableError(error);
  }

  return ((data ?? []) as PriceChangePreviewRowDb[]).map(mapPreviewRow);
}

export async function applyPriceChange(params: {
  criteria: PriceChangeCriteria;
  itemIds: string[];
  newCostPrice: number | null;
  newUnitPrice: number | null;
}): Promise<{ logId: string; changedItemCount: number; changedDocumentCount: number }> {
  const supabase = getSupabaseClient();
  const manualOnly = params.criteria.productId === MANUAL_PRICE_CHANGE_PRODUCT_ID;
  const { data, error } = await supabase.rpc('apply_document_item_price_change', {
    p_item_ids: params.itemIds.map((id) => Number(id)),
    p_new_cost_price: params.newCostPrice,
    p_new_unit_price: params.newUnitPrice,
    p_changed_by: getAuditActor(),
    p_date_from: toNullableText(params.criteria.dateFrom),
    p_date_to: toNullableText(params.criteria.dateTo),
    p_client_id: toNullableDbId(params.criteria.clientId),
    p_client_name: params.criteria.clientName.trim(),
    p_receiver: params.criteria.receiver.trim(),
    p_product_id: manualOnly ? null : toNullableDbId(params.criteria.productId),
    p_product_name: manualOnly ? '직접입력' : params.criteria.productName.trim(),
  });

  if (error) {
    throw toReadableError(error);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    logId: String(result?.log_id ?? ''),
    changedItemCount: Number(result?.changed_item_count ?? 0),
    changedDocumentCount: Number(result?.changed_document_count ?? 0),
  };
}

export async function fetchPriceChangeLogs(): Promise<PriceChangeLog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('price_change_logs')
    .select(
      'id, changed_at, changed_by, document_item_id, document_id, issue_no, base_date, date_from, date_to, client_id, client_name, receiver, product_id, product_name, old_cost_price, new_cost_price, old_unit_price, new_unit_price, changed_item_count, changed_document_count',
    )
    .order('changed_at', { ascending: false })
    .limit(50);

  if (error) {
    throw toReadableError(error);
  }

  return ((data ?? []) as PriceChangeLogDb[]).map(mapLogRow);
}

function mapPreviewRow(row: PriceChangePreviewRowDb): PriceChangePreviewRow {
  return {
    itemId: String(row.item_id),
    documentId: row.document_id,
    issueNo: row.issue_no ?? '',
    baseDate: row.base_date ?? null,
    clientId: row.client_id === null || row.client_id === undefined ? null : String(row.client_id),
    clientName: row.client_name ?? '',
    receiver: row.receiver ?? '',
    productId: row.product_id === null || row.product_id === undefined ? null : String(row.product_id),
    productName: row.product_name ?? '',
    qty: row.qty ?? 0,
    costPrice: row.cost_price ?? null,
    unitPrice: row.unit_price ?? 0,
    supply: row.supply ?? 0,
    vat: row.vat ?? false,
  };
}

function mapLogRow(row: PriceChangeLogDb): PriceChangeLog {
  return {
    id: String(row.id),
    changedAt: row.changed_at ?? null,
    changedBy: row.changed_by ?? '',
    documentItemId: row.document_item_id === null || row.document_item_id === undefined ? null : String(row.document_item_id),
    documentId: row.document_id ?? null,
    issueNo: row.issue_no ?? '',
    baseDate: row.base_date ?? null,
    dateFrom: row.date_from ?? null,
    dateTo: row.date_to ?? null,
    clientId: row.client_id === null || row.client_id === undefined ? null : String(row.client_id),
    clientName: row.client_name ?? '',
    receiver: row.receiver ?? '',
    productId: row.product_id === null || row.product_id === undefined ? null : String(row.product_id),
    productName: row.product_name ?? '',
    oldCostPrice: row.old_cost_price ?? null,
    newCostPrice: row.new_cost_price ?? null,
    oldUnitPrice: row.old_unit_price ?? null,
    newUnitPrice: row.new_unit_price ?? null,
    changedItemCount: row.changed_item_count ?? 0,
    changedDocumentCount: row.changed_document_count ?? 0,
  };
}

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toReadableError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('단가 변경 처리 중 알 수 없는 오류가 발생했습니다.');
}
