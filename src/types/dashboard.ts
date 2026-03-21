export type DashboardIncomingDocument = {
  id: string;
  issueNo: string;
  orderDate: string;
  arriveDate: string;
  client: string;
  receiver: string;
  receipt: string;
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
  cancelled: boolean;
  receipt: string;
};

export type DashboardSummary = {
  todayIncomingCount: number;
  weekIncomingCount: number;
  incompleteCount: number;
  todayIncomingDocuments: DashboardIncomingDocument[];
  weekIncomingDocuments: DashboardIncomingDocument[];
  incompleteDocuments: DashboardIncomingDocument[];
  recentDocuments: DashboardRecentDocument[];
};
