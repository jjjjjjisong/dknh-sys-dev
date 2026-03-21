import type { OrderBookShippingStatus, OrderBookStatus } from './order-book';

export type DashboardIncomingDocument = {
  id: string;
  documentId: string;
  orderBookId: string | null;
  issueNo: string;
  arriveDate: string;
  productName: string;
  client: string;
  receiver: string;
  qty: number;
  pallet: number | null;
  box: number | null;
  status: OrderBookStatus;
  shippedStatus: OrderBookShippingStatus;
};

export type DashboardRecentDocument = {
  id: string;
  issueNo: string;
  client: string;
  orderDate: string;
  arriveDate: string;
  receiver: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  status: OrderBookStatus;
  receipt: string;
};

export type DashboardArrivalTrend = {
  date: string;
  label: string;
  count: number;
  documents: DashboardIncomingDocument[];
};

export type DashboardSummary = {
  todayIncomingCount: number;
  weekIncomingCount: number;
  incompleteCount: number;
  completedCount: number;
  trackedCount: number;
  weekLabel: string;
  todayLabel: string;
  todayIncomingDocuments: DashboardIncomingDocument[];
  weekIncomingDocuments: DashboardIncomingDocument[];
  incompleteDocuments: DashboardIncomingDocument[];
  recentDocuments: DashboardRecentDocument[];
  weeklyArrivals: DashboardArrivalTrend[];
};
