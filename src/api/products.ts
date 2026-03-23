import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';
import type { Product, ProductInput } from '../types/product';

type ProductRow = {
  id: number | string;
  no: number | null;
  client_id: number | string | null;
  gubun: string | null;
  client: string | null;
  name1: string | null;
  name2: string | null;
  supplier: string | null;
  cost_price: number | null;
  sell_price: number | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
  del_yn?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

const productSelectColumns =
  'id, no, client_id, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck, del_yn, updated_at, updated_by';

export async function fetchProducts(): Promise<Product[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(productSelectColumns)
    .eq('del_yn', 'N')
    .order('no');

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((product: ProductRow) => mapProductRow(product));
}

export async function fetchProductsByClient(clientName: string): Promise<Product[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(productSelectColumns)
    .eq('del_yn', 'N')
    .eq('client', clientName)
    .order('no');

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((product: ProductRow) => mapProductRow(product));
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const supabase = getSupabaseClient();

  const nextNo = await fetchNextProductNo();
  const payload = {
    no: nextNo,
    client_id: Number(input.clientId),
    client: input.client,
    gubun: input.gubun,
    supplier: input.supplier,
    name1: input.name1,
    name2: input.name2,
    cost_price: input.cost_price,
    sell_price: input.sell_price,
    ea_per_b: input.ea_per_b,
    box_per_p: input.box_per_p,
    ea_per_p: input.ea_per_p,
    pallets_per_truck: input.pallets_per_truck,
    ...getActiveAuditFields(),
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select(productSelectColumns)
    .single();

  if (!error && data) {
    return mapProductRow(data);
  }

  if (isProductsPrimaryKeyError(error)) {
    const nextId = await fetchNextProductId();
    const retry = await supabase
      .from('products')
      .insert({
        id: nextId,
        ...payload,
      })
      .select(productSelectColumns)
      .single();

    if (!retry.error && retry.data) {
      return mapProductRow(retry.data);
    }

    throw toReadableError(retry.error);
  }

  throw toReadableError(error);
}

export async function updateProduct(id: string, currentNo: number | null, input: ProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .update({
      no: currentNo,
      client_id: Number(input.clientId),
      client: input.client,
      gubun: input.gubun,
      supplier: input.supplier,
      name1: input.name1,
      name2: input.name2,
      cost_price: input.cost_price,
      sell_price: input.sell_price,
      ea_per_b: input.ea_per_b,
      box_per_p: input.box_per_p,
      ea_per_p: input.ea_per_p,
      pallets_per_truck: input.pallets_per_truck,
      ...getActiveAuditFields(),
    })
    .eq('id', id)
    .select(productSelectColumns)
    .single();

  if (error || !data) {
    throw toReadableError(error);
  }

  return mapProductRow(data);
}

export async function removeProduct(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('products').update(getDeletedAuditFields()).eq('id', id);

  if (error) {
    throw toReadableError(error);
  }
}

async function fetchNextProductNo() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('no')
    .eq('del_yn', 'N')
    .order('no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toReadableError(error);
  }

  return (data?.no ?? 0) + 1;
}

async function fetchNextProductId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toReadableError(error);
  }

  return Number(data?.id ?? 0) + 1;
}

function isProductsPrimaryKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === '23505' && String(maybeError.message ?? '').includes('products_pkey');
}

function mapProductRow(product: ProductRow): Product {
  return {
    id: String(product.id),
    no: product.no ?? null,
    clientId: product.client_id === null || product.client_id === undefined ? null : String(product.client_id),
    gubun: product.gubun ?? '',
    client: product.client ?? '',
    name1: product.name1 ?? '',
    name2: product.name2 ?? '',
    supplier: product.supplier ?? '',
    cost_price: product.cost_price ?? null,
    sell_price: product.sell_price ?? null,
    ea_per_b: product.ea_per_b ?? null,
    box_per_p: product.box_per_p ?? null,
    ea_per_p: product.ea_per_p ?? null,
    pallets_per_truck: product.pallets_per_truck ?? null,
    delYn: (product.del_yn ?? 'N') as Product['delYn'],
    updatedAt: product.updated_at ?? null,
    updatedBy: product.updated_by ?? '',
  };
}

function toReadableError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('품목 저장 중 알 수 없는 오류가 발생했습니다.');
}
