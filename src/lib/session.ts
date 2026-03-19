import type { UserSession } from '../types/user';

const STORAGE_KEY = 'dkh_user';

export function getStoredUser(): UserSession | null {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: UserSession) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}
