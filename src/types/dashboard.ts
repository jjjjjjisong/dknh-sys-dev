export type RecentDocument = {
  id: string;
  issueNo: string;
  client: string;
  orderDate: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  cancelled: boolean;
};

export type DashboardSummary = {
  activeClientCount: number;
  productCount: number;
  documentCount: number;
  recentDocuments: RecentDocument[];
};
