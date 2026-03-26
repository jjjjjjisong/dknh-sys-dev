import type { UserSession } from '../types/user';

const STORAGE_KEY = 'dkh_user';
const SESSION_EVENT = 'dkh-session-change';
const TAB_COUNT_KEY = 'dkh_open_tab_count';
const TAB_REGISTERED_KEY = 'dkh_tab_registered';
const PENDING_CLEAR_KEY = 'dkh_pending_session_clear_at';
const SESSION_CLEAR_GRACE_MS = 3000;

let tabLifecycleBound = false;

export function getStoredUser(): UserSession | null {
  ensureTabLifecycle();
  reconcilePendingSessionClear();

  const raw =
    window.localStorage.getItem(STORAGE_KEY) ??
    migrateLegacySessionStorage() ??
    clearLegacyLocalStorageSession();

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
  ensureTabLifecycle();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(PENDING_CLEAR_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function isAdminUser(user: UserSession | null) {
  return user?.role === 'admin';
}

export function subscribeSessionChange(listener: () => void) {
  ensureTabLifecycle();
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function ensureTabLifecycle() {
  if (typeof window === 'undefined') return;

  reconcilePendingSessionClear();

  if (!window.sessionStorage.getItem(TAB_REGISTERED_KEY)) {
    const nextCount = getOpenTabCount() + 1;
    window.localStorage.setItem(TAB_COUNT_KEY, String(nextCount));
    window.sessionStorage.setItem(TAB_REGISTERED_KEY, 'Y');
    window.localStorage.removeItem(PENDING_CLEAR_KEY);
  }

  if (tabLifecycleBound) return;
  tabLifecycleBound = true;

  window.addEventListener('beforeunload', handleBeforeUnload);
}

function handleBeforeUnload() {
  const currentCount = getOpenTabCount();
  const nextCount = Math.max(currentCount - 1, 0);

  if (nextCount === 0) {
    window.localStorage.removeItem(TAB_COUNT_KEY);
    window.localStorage.setItem(PENDING_CLEAR_KEY, String(Date.now()));
  } else {
    window.localStorage.setItem(TAB_COUNT_KEY, String(nextCount));
  }

  window.sessionStorage.removeItem(TAB_REGISTERED_KEY);
}

function getOpenTabCount() {
  const raw = window.localStorage.getItem(TAB_COUNT_KEY);
  const parsed = Number.parseInt(raw ?? '0', 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

function migrateLegacySessionStorage() {
  const legacy = window.sessionStorage.getItem(STORAGE_KEY);
  if (!legacy) {
    return null;
  }

  window.localStorage.setItem(STORAGE_KEY, legacy);
  window.sessionStorage.removeItem(STORAGE_KEY);
  return legacy;
}

function clearLegacyLocalStorageSession() {
  return null;
}

function reconcilePendingSessionClear() {
  const pendingAtRaw = window.localStorage.getItem(PENDING_CLEAR_KEY);
  if (!pendingAtRaw) {
    return;
  }

  const pendingAt = Number.parseInt(pendingAtRaw, 10);
  if (Number.isNaN(pendingAt)) {
    window.localStorage.removeItem(PENDING_CLEAR_KEY);
    return;
  }

  const activeTabs = getOpenTabCount();
  if (activeTabs > 0 || Date.now() - pendingAt <= SESSION_CLEAR_GRACE_MS) {
    window.localStorage.removeItem(PENDING_CLEAR_KEY);
    return;
  }

  window.localStorage.removeItem(PENDING_CLEAR_KEY);
  window.localStorage.removeItem(TAB_COUNT_KEY);
  window.localStorage.removeItem(STORAGE_KEY);
}
