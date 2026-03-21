import { getStoredUser } from '../lib/session';

export type AuditStatus = 'Y' | 'N';

export function getAuditActor() {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const user = getStoredUser();
  if (!user) {
    return 'system';
  }

  return user.name ? `${user.id} (${user.name})` : user.id;
}

export function getAuditFields() {
  return {
    updated_at: new Date().toISOString(),
    updated_by: getAuditActor(),
  };
}

export function getActiveAuditFields() {
  return {
    del_yn: 'N' as AuditStatus,
    ...getAuditFields(),
  };
}

export function getDeletedAuditFields() {
  return {
    del_yn: 'Y' as AuditStatus,
    ...getAuditFields(),
  };
}
