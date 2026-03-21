import { getSupabaseClient } from './supabase/client';
import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import type { Client, ClientInput } from '../types/client';

export async function fetchClients(): Promise<Client[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, manager, tel, addr, time, lunch, note, active, del_yn, updated_at, updated_by')
    .eq('del_yn', 'N')
    .order('id');

  if (error) {
    throw error;
  }

  return (data ?? []).map((client: {
    id: number | string;
    name: string | null;
    manager: string | null;
    tel: string | null;
    addr: string | null;
    time: string | null;
    lunch: string | null;
    note: string | null;
    active: boolean | null;
  }) => ({
    id: String(client.id),
    name: client.name ?? '',
    manager: client.manager ?? '',
    tel: client.tel ?? '',
    addr: client.addr ?? '',
    time: client.time ?? '',
    lunch: client.lunch ?? '',
    note: client.note ?? '',
    active: client.active ?? true,
  }));
}

export async function createClient(input: ClientInput): Promise<Client> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({
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
    .select('id, name, manager, tel, addr, time, lunch, note, active, del_yn, updated_at, updated_by')
    .single();

  if (error) {
    throw error;
  }

  return mapClientRow(data);
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
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
    .eq('id', id)
    .select('id, name, manager, tel, addr, time, lunch, note, active, del_yn, updated_at, updated_by')
    .single();

  if (error) {
    throw error;
  }

  return mapClientRow(data);
}

export async function removeClient(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('clients').update(getDeletedAuditFields()).eq('id', id);

  if (error) {
    throw error;
  }
}

function mapClientRow(client: {
  id: number | string;
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
}): Client {
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
