export type AccountRole = 'admin' | 'user';

export type Account = {
  id: string;
  password: string;
  passwordHash: string;
  passwordAlgo: 'legacy-plain' | 'pbkdf2-sha256';
  name: string;
  rank: string;
  tel: string;
  email: string;
  role: AccountRole;
  loginFailCount: number;
  lockedAt: string | null;
  lastLoginAt: string | null;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type AccountInput = {
  id: string;
  password: string;
  name: string;
  rank: string;
  tel: string;
  email: string;
  role: AccountRole;
};
