import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import { getSupabaseClient } from './supabase/client';
import type { Client, ClientInput } from '../types/client';

type ClientRow = {
  id: number | string;
  created_at?: string | null;
  name: string | null;
  manager: string | null;
  tel: string | null;
  addr: string | null;
  time: string | null;
  lunch: string | null;
  note: string | null;
  active: boolean | null;
  del_yn?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

const clientSelectColumns =
  'id, created_at, name, manager, tel, addr, time, lunch, note, active, del_yn, updated_at, updated_by';

export async function fetchClients(): Promise<Client[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select(clientSelectColumns)
    .eq('del_yn', 'N')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((client: ClientRow) => mapClientRow(client));
}

export async function createClient(input: ClientInput): Promise<void> {
  const supabase = getSupabaseClient();
  const payload = {
    name: input.name,
    manager: input.manager,
    tel: input.tel,
    addr: input.addr,
    time: input.time,
    lunch: input.lunch,
    note: input.note,
    active: input.active,
    ...getActiveAuditFields(),
  };

  const { error } = await supabase.from('clients').insert(payload);

  if (!error) {
    return;
  }

  if (isClientsPrimaryKeyError(error)) {
    const nextId = await fetchNextClientId();
    const retry = await supabase.from('clients').insert({
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

export async function updateClient(id: string, input: ClientInput): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('clients')
    .update({
      name: input.name,
      manager: input.manager,
      tel: input.tel,
      addr: input.addr,
      time: input.time,
      lunch: input.lunch,
      note: input.note,
      active: input.active,
      ...getActiveAuditFields(),
    })
    .eq('id', id);

  if (error) {
    throw toReadableError(error);
  }
}

export async function removeClient(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clients').update(getDeletedAuditFields()).eq('id', id);

  if (error) {
    throw toReadableError(error);
  }
}

function mapClientRow(client: ClientRow): Client {
  return {
    id: String(client.id),
    name: client.name ?? '',
    manager: client.manager ?? '',
    tel: client.tel ?? '',
    addr: client.addr ?? '',
    time: client.time ?? '',
    lunch: client.lunch ?? '',
    note: client.note ?? '',
    active: client.active ?? true,
    delYn: (client.del_yn ?? 'N') as Client['delYn'],
    updatedAt: client.updated_at ?? null,
    updatedBy: client.updated_by ?? '',
  };
}

function isClientsPrimaryKeyError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === '23505' && String(maybeError.message ?? '').includes('clients_pkey');
}

async function fetchNextClientId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
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

  return new Error('납품처 저장 중 알 수 없는 오류가 발생했습니다.');
}
