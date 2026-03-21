export type Client = {
  id: string;
  name: string;
  manager: string;
  tel: string;
  addr: string;
  time: string;
  lunch: string;
  note: string;
  active: boolean;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type ClientInput = {
  name: string;
  manager: string;
  tel: string;
  addr: string;
  time: string;
  lunch: string;
  note: string;
  active: boolean;
};
