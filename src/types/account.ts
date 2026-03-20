export type AccountRole = 'admin' | 'user';

export type Account = {
  id: string;
  password: string;
  name: string;
  rank: string;
  tel: string;
  email: string;
  role: AccountRole;
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
