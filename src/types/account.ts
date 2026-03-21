export type AccountRole = 'admin' | 'user';

export type Account = {
  id: string;
  password: string;
  name: string;
  rank: string;
  tel: string;
  email: string;
  role: AccountRole;
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
