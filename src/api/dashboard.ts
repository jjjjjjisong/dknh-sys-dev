import { getSupabaseClient } from './supabase/client';
import type { DashboardSummary, RecentDocument } from '../types/dashboard';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const supabase = getSupabaseClient();

  const [clientsResult, productsCountResult, documentsCountResult, recentDocumentsResult] =
    await Promise.all([
      supabase.from('clients').select('id, active').order('id'),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase
        .from('documents')
        .select('id, issue_no, client, order_date, author, created_at, updated_at, cancelled')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  if (clientsResult.error) throw clientsResult.error;
  if (productsCountResult.error) throw productsCountResult.error;
  if (documentsCountResult.error) throw documentsCountResult.error;
  if (recentDocumentsResult.error) throw recentDocumentsResult.error;

  const activeClientCount = (clientsResult.data ?? []).filter(
    (client: { active: boolean | null }) => client.active !== false,
  ).length;

  const recentDocuments: RecentDocument[] = (recentDocumentsResult.data ?? []).map(
    (document: {
      id: number | string;
      issue_no: number | string | null;
      client: string | null;
      order_date: string | null;
      author: string | null;
      created_at: string | null;
      updated_at: string | null;
      cancelled: boolean | null;
    }) => ({
      id: String(document.id),
      issueNo: String(document.issue_no ?? ''),
      client: document.client ?? '',
      orderDate: document.order_date ?? '',
      author: document.author ?? '',
      createdAt: document.created_at ?? '',
      updatedAt: document.updated_at ?? '',
      cancelled: document.cancelled ?? false,
    }),
  );

  return {
    activeClientCount,
    productCount: productsCountResult.count ?? 0,
    documentCount: documentsCountResult.count ?? 0,
    recentDocuments,
  };
}
