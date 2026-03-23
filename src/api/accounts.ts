import { getSupabaseClient } from './supabase/client';
import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import type { Account, AccountInput } from '../types/account';
import type { UserSession } from '../types/user';
import { getPasswordAlgorithm, hashPassword, verifyPassword } from '../lib/password';

const ACCOUNT_SELECT_COLUMNS =
  'id, password, password_hash, password_algo, name, rank, tel, email, role, login_fail_count, locked_at, last_login_at, del_yn, updated_at, updated_by';
const MAX_LOGIN_FAIL_COUNT = 5;

export async function fetchAccounts(): Promise<Account[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('accounts')
    .select(ACCOUNT_SELECT_COLUMNS)
    .eq('del_yn', 'N')
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
    .select('id, password, password_hash, password_algo, name, rank, role, login_fail_count, locked_at')
    .eq('id', id.trim())
    .eq('del_yn', 'N')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (data.locked_at) {
    throw new Error('잠긴 계정입니다. 관리자에게 문의해 주세요.');
  }

  const passwordMatched = await isPasswordMatched(password, {
    password: data.password ?? '',
    passwordHash: data.password_hash ?? '',
    passwordAlgo: data.password_algo ?? 'legacy-plain',
  });

  if (!passwordMatched) {
    await recordLoginFailure(id.trim(), Number(data.login_fail_count ?? 0));
    return null;
  }

  await finalizeLoginSuccess({
    id: data.id ?? '',
    password,
    passwordHash: data.password_hash ?? '',
    passwordAlgo: data.password_algo ?? 'legacy-plain',
  });

  return {
    id: data.id ?? '',
    name: data.name ?? '',
    rank: data.rank ?? '',
    role: (data.role ?? 'user') as UserSession['role'],
  };
}

export async function createAccount(input: AccountInput): Promise<Account> {
  const supabase = getSupabaseClient();
  const payload = await normalizeAccountInput(input);

  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...payload, ...getActiveAuditFields() })
    .select(ACCOUNT_SELECT_COLUMNS)
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

  const payload = await normalizeAccountUpdateInput(input, current);

  const { data, error } = await supabase
    .from('accounts')
    .update({ ...payload, ...getActiveAuditFields() })
    .eq('id', originalId)
    .select(ACCOUNT_SELECT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapAccountRow(data);
}

export async function removeAccount(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('accounts').update(getDeletedAuditFields()).eq('id', id);

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

  const passwordHash = await hashPassword(nextPassword);
  const { data, error } = await supabase
    .from('accounts')
    .update({
      password: '',
      password_hash: passwordHash,
      password_algo: getPasswordAlgorithm(),
      password_changed_at: new Date().toISOString(),
      is_temp_password: true,
      login_fail_count: 0,
      locked_at: null,
      ...getActiveAuditFields(),
    })
    .eq('id', id)
    .select(ACCOUNT_SELECT_COLUMNS)
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
    .select(ACCOUNT_SELECT_COLUMNS)
    .eq('id', id)
    .eq('del_yn', 'N')
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

async function normalizeAccountInput(input: AccountInput) {
  const normalizedPassword = input.password.trim();
  const passwordHash = await hashPassword(normalizedPassword);

  return {
    id: input.id.trim(),
    password: '',
    password_hash: passwordHash,
    password_algo: getPasswordAlgorithm(),
    password_changed_at: new Date().toISOString(),
    is_temp_password: false,
    login_fail_count: 0,
    locked_at: null,
    last_login_at: null,
    name: input.name.trim(),
    rank: input.rank.trim(),
    tel: input.tel.trim(),
    email: input.email.trim(),
    role: input.role,
  };
}

async function normalizeAccountUpdateInput(input: AccountInput, current: Account) {
  const nextPassword = input.password.trim();

  if (!nextPassword) {
    return {
      id: input.id.trim(),
      name: input.name.trim(),
      rank: input.rank.trim(),
      tel: input.tel.trim(),
      email: input.email.trim(),
      role: input.role,
    };
  }

  const passwordHash = await hashPassword(nextPassword);
  return {
    id: input.id.trim(),
    password: '',
    password_hash: passwordHash,
    password_algo: getPasswordAlgorithm(),
    password_changed_at: new Date().toISOString(),
    is_temp_password: false,
    login_fail_count: 0,
    locked_at: null,
    last_login_at: current.lastLoginAt,
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
  password_hash?: string | null;
  password_algo?: string | null;
  name: string | null;
  rank: string | null;
  tel: string | null;
  email: string | null;
  role: string | null;
  login_fail_count?: number | null;
  locked_at?: string | null;
  last_login_at?: string | null;
  del_yn?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}): Account {
  return {
    id: row.id ?? '',
    password: row.password ?? '',
    passwordHash: row.password_hash ?? '',
    passwordAlgo: (row.password_algo ?? 'legacy-plain') as Account['passwordAlgo'],
    name: row.name ?? '',
    rank: row.rank ?? '',
    tel: row.tel ?? '',
    email: row.email ?? '',
    role: (row.role ?? 'user') as Account['role'],
    loginFailCount: row.login_fail_count ?? 0,
    lockedAt: row.locked_at ?? null,
    lastLoginAt: row.last_login_at ?? null,
    delYn: (row.del_yn ?? 'N') as Account['delYn'],
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
  };
}

async function isPasswordMatched(
  password: string,
  current: { password: string; passwordHash: string; passwordAlgo: string },
) {
  if (current.passwordAlgo === getPasswordAlgorithm() && current.passwordHash) {
    return verifyPassword(password, current.passwordHash);
  }

  if (current.password && current.password === password) {
    return true;
  }

  return false;
}

async function finalizeLoginSuccess(current: {
  id: string;
  password: string;
  passwordHash: string;
  passwordAlgo: string;
}) {
  const supabase = getSupabaseClient();
  const loginAuditFields = {
    ...getActiveAuditFields(),
    login_fail_count: 0,
    locked_at: null,
    last_login_at: new Date().toISOString(),
  };

  if (current.passwordAlgo === getPasswordAlgorithm() && current.passwordHash) {
    const { error } = await supabase.from('accounts').update(loginAuditFields).eq('id', current.id);
    if (error) throw error;
    return;
  }

  const passwordHash = await hashPassword(current.password);
  const { error } = await supabase
    .from('accounts')
    .update({
      password: '',
      password_hash: passwordHash,
      password_algo: getPasswordAlgorithm(),
      password_changed_at: new Date().toISOString(),
      is_temp_password: false,
      ...loginAuditFields,
    })
    .eq('id', current.id);

  if (error) throw error;
}

async function recordLoginFailure(id: string, currentCount: number) {
  const supabase = getSupabaseClient();
  const nextCount = currentCount + 1;
  const shouldLock = nextCount >= MAX_LOGIN_FAIL_COUNT;

  const { error } = await supabase
    .from('accounts')
    .update({
      ...getActiveAuditFields(),
      login_fail_count: nextCount,
      locked_at: shouldLock ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw error;
}
