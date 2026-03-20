import { getSupabaseClient } from './supabase/client';
import type { Account, AccountInput } from '../types/account';
import type { UserSession } from '../types/user';

export async function fetchAccounts(): Promise<Account[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, password, name, rank, tel, email, role')
    .order('id');

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAccountRow);
}

export async function authenticateAccount(id: string, password: string): Promise<UserSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, rank, role')
    .eq('id', id.trim())
    .eq('password', password)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id ?? '',
    name: data.name ?? '',
    rank: data.rank ?? '',
    role: (data.role ?? 'user') as UserSession['role'],
  };
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const supabase = getSupabaseClient();
  const payload = normalizeAccountInput(input);

  const { data, error } = await supabase
    .from('accounts')
    .insert(payload)
    .select('id, password, name, rank, tel, email, role')
    .single();

  if (error) {
    throw error;
  }

  return mapAccountRow(data);
}

export async function updateAccount(originalId: string, input: AccountInput): Promise<Account> {
  const supabase = getSupabaseClient();

  const current = await fetchAccountById(originalId);
  if (!current) {
    throw new Error('수정할 계정을 찾지 못했습니다.');
  }

  const payload = normalizeAccountInput({
    ...input,
    password: input.password.trim() ? input.password : current.password,
  });

  const { data, error } = await supabase
    .from('accounts')
    .update(payload)
    .eq('id', originalId)
    .select('id, password, name, rank, tel, email, role')
    .single();

  if (error) {
    throw error;
  }

  return mapAccountRow(data);
}

export async function removeAccount(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('accounts').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function resetAccountPassword(id: string, password: string): Promise<Account> {
  const supabase = getSupabaseClient();
  const nextPassword = password.trim();
  if (!nextPassword) {
    throw new Error('새 비밀번호를 입력해주세요.');
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({ password: nextPassword })
    .eq('id', id)
    .select('id, password, name, rank, tel, email, role')
    .single();

  if (error) {
    throw error;
  }

  return mapAccountRow(data);
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, password, name, rank, tel, email, role')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAccountRow(data) : null;
}

export function toUserSession(account: Account): UserSession {
  return {
    id: account.id,
    name: account.name,
    rank: account.rank,
    role: account.role,
  };
}

function normalizeAccountInput(input: AccountInput) {
  return {
    id: input.id.trim(),
    password: input.password.trim(),
    name: input.name.trim(),
    rank: input.rank.trim(),
    tel: input.tel.trim(),
    email: input.email.trim(),
    role: input.role,
  };
}

function mapAccountRow(row: {
  id: string | null;
  password: string | null;
  name: string | null;
  rank: string | null;
  tel: string | null;
  email: string | null;
  role: string | null;
}): Account {
  return {
    id: row.id ?? '',
    password: row.password ?? '',
    name: row.name ?? '',
    rank: row.rank ?? '',
    tel: row.tel ?? '',
    email: row.email ?? '',
    role: (row.role ?? 'user') as Account['role'],
  };
}
