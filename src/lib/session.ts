import type { UserSession } from '../types/user';

const STORAGE_KEY = 'dkh_user';
const SESSION_EVENT = 'dkh-session-change';

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
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function clearStoredUser() {
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function isAdminUser(user: UserSession | null) {
  return user?.role === 'admin';
}

export function subscribeSessionChange(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  return () => window.removeEventListener(SESSION_EVENT, listener);
}
