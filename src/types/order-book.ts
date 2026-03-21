export type OrderBookStatus = 'ST00' | 'ST01';

export type OrderBookEntry = {
  id: string;
  docId: string | null;
  issueNo: string;
  date: string | null;
  deadline: string | null;
  client: string;
  product: string;
  qty: number;
  note: string;
  receipt: string;
  status: OrderBookStatus;
  fromDoc: boolean;
  createdAt: string | null;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type OrderBookInput = {
  issueNo: string;
  date: string | null;
  deadline: string | null;
  client: string;
  product: string;
  qty: number;
  note: string;
  receipt: string;
  status: OrderBookStatus;
};
