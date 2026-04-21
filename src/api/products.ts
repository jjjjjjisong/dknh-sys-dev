import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';
import type {
  Product,
  ProductInput,
  ProductMaster,
  ProductMasterInput,
} from '../types/product';
import { DEFAULT_GUBUN } from '../features/products/constants';
import { toNullableDbId } from '../utils/dbIds';

type ProductMasterRow = {
  id: number | string;
  name1: string | null;
  name2: string | null;
  gubun: string | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
  del_yn?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

type ProductRow = {
  id: number | string;
  no: number | null;
  product_master_id: number | string | null;
  client_id: number | string | null;
  receiver: string | null;
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
  product_master?: ProductMasterRow | ProductMasterRow[] | null;
};

const productSelectColumns =
  'id, no, product_master_id, client_id, receiver, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck, del_yn, updated_at, updated_by, product_master:product_masters(id, name1, name2, gubun, ea_per_b, box_per_p, ea_per_p, pallets_per_truck, del_yn, updated_at, updated_by)';

const productMasterSelectColumns =
  'id, name1, name2, gubun, ea_per_b, box_per_p, ea_per_p, pallets_per_truck, del_yn, updated_at, updated_by';

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

export async function fetchProductsByClientId(clientId: string): Promise<Product[]> {
  const normalizedClientId = toNullableDbId(clientId);
  if (normalizedClientId === null) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(productSelectColumns)
    .eq('del_yn', 'N')
    .eq('client_id', normalizedClientId)
    .order('no');

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((product: ProductRow) => mapProductRow(product));
}

export async function fetchProductMasters(): Promise<ProductMaster[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('product_masters')
    .select(productMasterSelectColumns)
    .eq('del_yn', 'N')
    .order('id');

  if (error) {
    throw toReadableError(error);
  }

  const linkedCounts = await fetchLinkedProductCounts();
  return (data ?? []).map((master: ProductMasterRow) => mapProductMasterRow(master, linkedCounts));
}

export async function createProductMaster(input: ProductMasterInput): Promise<ProductMaster> {
  const supabase = getSupabaseClient();
  const payload = buildProductMasterPayload(input);

  const { data, error } = await supabase
    .from('product_masters')
    .insert(payload)
    .select(productMasterSelectColumns)
    .single();

  if (error || !data) {
    throw toReadableError(error);
  }

  return mapProductMasterRow(data, new Map());
}

export async function updateProductMaster(id: string, input: ProductMasterInput): Promise<ProductMaster> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('product_masters')
    .update(buildProductMasterPayload(input))
    .eq('id', id)
    .eq('del_yn', 'N')
    .select(productMasterSelectColumns)
    .single();

  if (error || !data) {
    throw toReadableError(error);
  }

  const linkedCounts = await fetchLinkedProductCounts();
  return mapProductMasterRow(data, linkedCounts);
}

export async function removeProductMaster(id: string) {
  const supabase = getSupabaseClient();
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('product_master_id', id)
    .eq('del_yn', 'N');

  if (countError) {
    throw toReadableError(countError);
  }

  if ((count ?? 0) > 0) {
    throw new Error('연결된 거래처별 품목이 있어 공통 품목을 삭제할 수 없습니다.');
  }

  const { error } = await supabase
    .from('product_masters')
    .update(getDeletedAuditFields())
    .eq('id', id)
    .eq('del_yn', 'N');

  if (error) {
    throw toReadableError(error);
  }
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const nextNo = await fetchNextProductNo();
  const payload = buildProductPayload(input, nextNo);

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

export async function updateProduct(
  id: string,
  currentNo: number | null,
  input: ProductInput,
): Promise<Product> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .update(buildProductPayload(input, currentNo))
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

export async function saveProductMaster(
  id: string | null,
  input: ProductMasterInput,
): Promise<ProductMaster> {
  validateProductMasterInput(input);
  return id ? updateProductMaster(id, input) : createProductMaster(input);
}

export async function saveProduct(
  target: { id: string; currentNo: number | null } | null,
  input: ProductInput,
): Promise<Product> {
  validateProductInput(input);
  return target ? updateProduct(target.id, target.currentNo, input) : createProduct(input);
}

async function fetchLinkedProductCounts() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('product_master_id')
    .eq('del_yn', 'N');

  if (error) {
    throw toReadableError(error);
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const productMasterId = String(
      (row as { product_master_id?: string | number | null }).product_master_id ?? '',
    ).trim();
    if (!productMasterId) continue;
    counts.set(productMasterId, (counts.get(productMasterId) ?? 0) + 1);
  }

  return counts;
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

function validateProductMasterInput(input: ProductMasterInput) {
  if (!input.name1.trim()) {
    throw new Error('공통 품목명을 입력해 주세요.');
  }
}

function validateProductInput(input: ProductInput) {
  if (!input.productMasterId.trim()) {
    throw new Error('공통 품목을 선택해 주세요.');
  }

  if (!input.client.trim() || !input.clientId.trim()) {
    throw new Error('거래처를 선택해 주세요.');
  }

  if (!input.name1.trim()) {
    throw new Error('거래처별 품목명을 입력해 주세요.');
  }
}

function buildProductMasterPayload(input: ProductMasterInput) {
  const name1 = input.name1.trim();
  const name2 = input.name2.trim() || name1;

  return {
    name1,
    name2,
    gubun: input.gubun.trim() || DEFAULT_GUBUN,
    ea_per_b: input.ea_per_b,
    box_per_p: input.box_per_p,
    ea_per_p:
      input.ea_per_b !== null && input.box_per_p !== null
        ? input.ea_per_b * input.box_per_p
        : input.ea_per_p,
    pallets_per_truck: input.pallets_per_truck,
    ...getActiveAuditFields(),
  };
}

function buildProductPayload(input: ProductInput, no: number | null) {
  const productMasterId = toNullableDbId(input.productMasterId);
  if (productMasterId === null) {
    throw new Error('공통 품목을 선택해 주세요.');
  }

  const client = input.client.trim();
  const receiver = input.receiver.trim();
  const name1 = input.name1.trim();
  const name2 = input.name2.trim() || name1;

  return {
    no,
    product_master_id: productMasterId,
    client_id: toNullableDbId(input.clientId),
    receiver,
    client,
    gubun: input.gubun.trim() || DEFAULT_GUBUN,
    supplier: receiver,
    name1,
    name2,
    cost_price: input.cost_price,
    sell_price: input.sell_price,
    ea_per_b: input.ea_per_b,
    box_per_p: input.box_per_p,
    ea_per_p:
      input.ea_per_b !== null && input.box_per_p !== null
        ? input.ea_per_b * input.box_per_p
        : input.ea_per_p,
    pallets_per_truck: input.pallets_per_truck,
    ...getActiveAuditFields(),
  };
}

function mapProductMasterRow(
  productMaster: ProductMasterRow,
  linkedCounts: Map<string, number>,
): ProductMaster {
  const id = String(productMaster.id);
  return {
    id,
    name1: productMaster.name1 ?? '',
    name2: productMaster.name2 ?? '',
    gubun: productMaster.gubun ?? '',
    ea_per_b: productMaster.ea_per_b ?? null,
    box_per_p: productMaster.box_per_p ?? null,
    ea_per_p: productMaster.ea_per_p ?? null,
    pallets_per_truck: productMaster.pallets_per_truck ?? null,
    linkedProductCount: linkedCounts.get(id) ?? 0,
    delYn: (productMaster.del_yn ?? 'N') as ProductMaster['delYn'],
    updatedAt: productMaster.updated_at ?? null,
    updatedBy: productMaster.updated_by ?? '',
  };
}

function normalizeProductMasterRelation(
  productMaster: ProductRow['product_master'],
): ProductMasterRow | null {
  if (Array.isArray(productMaster)) {
    return productMaster[0] ?? null;
  }
  return productMaster ?? null;
}

function mapProductRow(product: ProductRow): Product {
  const productMaster = normalizeProductMasterRelation(product.product_master);
  const receiver = product.receiver ?? product.supplier ?? '';

  return {
    id: String(product.id),
    no: product.no ?? null,
    productMasterId:
      product.product_master_id === null || product.product_master_id === undefined
        ? null
        : String(product.product_master_id),
    masterName1: productMaster?.name1 ?? product.name1 ?? '',
    masterName2: productMaster?.name2 ?? product.name2 ?? '',
    masterGubun: productMaster?.gubun ?? product.gubun ?? '',
    clientId:
      product.client_id === null || product.client_id === undefined
        ? null
        : String(product.client_id),
    receiver,
    gubun: productMaster?.gubun ?? product.gubun ?? '',
    client: product.client ?? '',
    name1: product.name1 ?? '',
    name2: product.name2 ?? '',
    cost_price: product.cost_price ?? null,
    sell_price: product.sell_price ?? null,
    ea_per_b: productMaster?.ea_per_b ?? product.ea_per_b ?? null,
    box_per_p: productMaster?.box_per_p ?? product.box_per_p ?? null,
    ea_per_p: productMaster?.ea_per_p ?? product.ea_per_p ?? null,
    pallets_per_truck: productMaster?.pallets_per_truck ?? product.pallets_per_truck ?? null,
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

  return new Error('품목 처리 중 알 수 없는 오류가 발생했습니다.');
}
