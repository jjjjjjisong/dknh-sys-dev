import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';
import type { Supplier, SupplierInput } from '../types/supplier';

type SupplierRow = {
  id: number | string;
  name: string | null;
  biz_no: string | null;
  owner: string | null;
  address: string | null;
  business_type: string | null;
  business_item: string | null;
  active: boolean | null;
  del_yn?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

const supplierSelectColumns =
  'id, name, biz_no, owner, address, business_type, business_item, active, del_yn, updated_at, updated_by';

export async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select(supplierSelectColumns)
    .eq('del_yn', 'N')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((row: SupplierRow) => mapSupplierRow(row));
}

export async function createSupplier(input: SupplierInput): Promise<void> {
  const supabase = getSupabaseClient();
  const payload = {
    name: input.name,
    biz_no: input.bizNo,
    owner: input.owner,
    address: input.address,
    business_type: input.businessType,
    business_item: input.businessItem,
    active: input.active,
    ...getActiveAuditFields(),
  };

  const { error } = await supabase.from('suppliers').insert(payload);

  if (!error) {
    return;
  }

  if (isSuppliersPrimaryKeyError(error)) {
    const nextId = await fetchNextSupplierId();
    const retry = await supabase.from('suppliers').insert({
      id: nextId,
      ...payload,
    });

    if (!retry.error) {
      return;
    }

    throw toReadableError(retry.error);
  }

  throw toReadableError(error);
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('suppliers')
    .update({
      name: input.name,
      biz_no: input.bizNo,
      owner: input.owner,
      address: input.address,
      business_type: input.businessType,
      business_item: input.businessItem,
      active: input.active,
      ...getActiveAuditFields(),
    })
    .eq('id', id);

  if (error) {
    throw toReadableError(error);
  }
}

export async function removeSupplier(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('suppliers').update(getDeletedAuditFields()).eq('id', id);

  if (error) {
    throw toReadableError(error);
  }
}

function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: String(row.id),
    name: row.name ?? '',
    bizNo: row.biz_no ?? '',
    owner: row.owner ?? '',
    address: row.address ?? '',
    businessType: row.business_type ?? '',
    businessItem: row.business_item ?? '',
    active: row.active ?? true,
    delYn: (row.del_yn ?? 'N') as Supplier['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

function isSuppliersPrimaryKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === '23505' && String(maybeError.message ?? '').includes('suppliers_pkey');
}

async function fetchNextSupplierId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toReadableError(error);
  }

  return Number(data?.id ?? 0) + 1;
}

function toReadableError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('공급자 처리 중 알 수 없는 오류가 발생했습니다.');
}
