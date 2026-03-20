import type { Account, AccountInput } from '../types/account';
import type { UserSession } from '../types/user';

const STORAGE_KEY = 'dkh_accounts';

const defaultAccounts: Account[] = [
  {
    id: 'admin',
    password: 'dkh2025!',
    name: '관리자',
    rank: '',
    tel: '',
    email: '',
    role: 'admin',
  },
  {
    id: 'user1',
    password: 'dkh1234',
    name: '사용자1',
    rank: '',
    tel: '',
    email: '',
    role: 'user',
  },
  {
    id: 'user2',
    password: 'dkh1234',
    name: '사용자2',
    rank: '',
    tel: '',
    email: '',
    role: 'user',
  },
  {
    id: 'user3',
    password: 'dkh1234',
    name: '사용자3',
    rank: '',
    tel: '',
    email: '',
    role: 'user',
  },
];

export function getAccounts(): Account[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  }

  try {
    const parsed = JSON.parse(raw) as Account[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAccounts));
      return defaultAccounts;
    }
    return parsed;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  }
}

export function saveAccounts(accounts: Account[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function authenticateAccount(id: string, password: string): UserSession | null {
  const account = getAccounts().find(
    (item) => item.id === id.trim() && item.password === password,
  );

  return account ? toUserSession(account) : null;
}

export function createAccount(input: AccountInput) {
  const accounts = getAccounts();
  if (accounts.some((account) => account.id === input.id.trim())) {
    throw new Error('이미 사용 중인 아이디입니다.');
  }

  const next: Account = normalizeAccountInput(input);
  const updated = [...accounts, next];
  saveAccounts(updated);
  return next;
}

export function updateAccount(originalId: string, input: AccountInput) {
  const accounts = getAccounts();
  const target = accounts.find((account) => account.id === originalId);

  if (!target) {
    throw new Error('수정할 계정을 찾지 못했습니다.');
  }

  const next = normalizeAccountInput({
    ...input,
    password: input.password.trim() ? input.password : target.password,
  });

  if (
    next.id !== originalId &&
    accounts.some((account) => account.id === next.id)
  ) {
    throw new Error('이미 사용 중인 아이디입니다.');
  }

  const updated = accounts.map((account) =>
    account.id === originalId ? next : account,
  );
  saveAccounts(updated);
  return next;
}

export function removeAccount(id: string) {
  const accounts = getAccounts();
  const updated = accounts.filter((account) => account.id !== id);
  saveAccounts(updated);
}

export function resetAccountPassword(id: string, password: string) {
  const nextPassword = password.trim();
  if (!nextPassword) {
    throw new Error('새 비밀번호를 입력해주세요.');
  }

  const accounts = getAccounts();
  const target = accounts.find((account) => account.id === id);

  if (!target) {
    throw new Error('비밀번호를 초기화할 계정을 찾지 못했습니다.');
  }

  const updated = accounts.map((account) =>
    account.id === id ? { ...account, password: nextPassword } : account,
  );

  saveAccounts(updated);
  return { ...target, password: nextPassword };
}

export function getAccountById(id: string) {
  return getAccounts().find((account) => account.id === id) ?? null;
}

export function toUserSession(account: Account): UserSession {
  return {
    id: account.id,
    name: account.name,
    rank: account.rank,
    role: account.role,
  };
}

function normalizeAccountInput(input: AccountInput): Account {
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
