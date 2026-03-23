export type UserSession = {
  id: string;
  name: string;
  rank: string;
  role: 'admin' | 'user';
};
