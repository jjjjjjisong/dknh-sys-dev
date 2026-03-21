import type { UserSession } from '../types/user';

const STORAGE_KEY = 'dkh_user';
const SESSION_EVENT = 'dkh-session-change';

export function getStoredUser(): UserSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? migrateLegacySessionStorage();
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function isAdminUser(user: UserSession | null) {
  return user?.role === 'admin';
}

export function subscribeSessionChange(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function migrateLegacySessionStorage() {
  const legacy = window.sessionStorage.getItem(STORAGE_KEY);
  if (!legacy) {
    return null;
  }

  window.localStorage.setItem(STORAGE_KEY, legacy);
  return legacy;
}
