import { getSupabaseClient } from './supabase/client';
import type {
  DashboardIncomingDocument,
  DashboardRecentDocument,
  DashboardSummary,
} from '../types/dashboard';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const supabase = getSupabaseClient();

  const [documentsResult, orderBookResult] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, issue_no, client, receiver, order_date, arrive_date, author, created_at, updated_at, cancelled',
      )
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('order_book')
      .select('issue_no, receipt, cancelled, from_doc')
      .order('created_at', { ascending: false }),
  ]);

  if (documentsResult.error) throw documentsResult.error;
  if (orderBookResult.error) throw orderBookResult.error;

  const today = new Date();
  const todayKey = toDateKey(today);
  const weekRange = getWeekRange(today);

  const receiptMap = new Map<string, string>();

  for (const row of orderBookResult.data ?? []) {
    const issueNo = String(row.issue_no ?? '').trim();
    if (!issueNo) continue;

    const current = receiptMap.get(issueNo) ?? '';
    const next = String(row.receipt ?? '').trim();

    if (!current || isReceiptCompleted(next)) {
      receiptMap.set(issueNo, next);
    }
  }

  const mappedDocuments: DashboardRecentDocument[] = (documentsResult.data ?? [])
    .filter((document: any) => !(document.cancelled ?? false))
    .map((document: any) => {
      const issueNo = String(document.issue_no ?? '');
      const receipt = receiptMap.get(issueNo) ?? '';

      return {
        id: String(document.id),
        issueNo,
        client: document.client ?? '',
        receiver: document.receiver ?? '',
        orderDate: document.order_date ?? '',
        arriveDate: document.arrive_date ?? '',
        author: document.author ?? '',
        createdAt: document.created_at ?? '',
        updatedAt: document.updated_at ?? '',
        cancelled: document.cancelled ?? false,
        receipt,
      };
    });

  const todayIncomingDocuments = mappedDocuments
    .filter((document) => document.arriveDate === todayKey)
    .sort(compareIncomingDocuments)
    .map(mapIncomingDocument);

  const weekIncomingDocuments = mappedDocuments
    .filter(
      (document) =>
        Boolean(document.arriveDate) &&
        document.arriveDate >= weekRange.start &&
        document.arriveDate <= weekRange.end &&
        !isReceiptCompleted(document.receipt),
    )
    .sort(compareIncomingDocuments)
    .map(mapIncomingDocument);

  const incompleteDocuments = mappedDocuments
    .filter((document) => !isReceiptCompleted(document.receipt))
    .sort(compareIncomingDocuments)
    .map(mapIncomingDocument);

  return {
    todayIncomingCount: todayIncomingDocuments.length,
    weekIncomingCount: weekIncomingDocuments.length,
    incompleteCount: incompleteDocuments.length,
    todayIncomingDocuments,
    weekIncomingDocuments,
    incompleteDocuments,
    recentDocuments: mappedDocuments.slice(0, 8),
  };
}

function mapIncomingDocument(document: DashboardRecentDocument): DashboardIncomingDocument {
  return {
    id: document.id,
    issueNo: document.issueNo,
    orderDate: document.orderDate,
    arriveDate: document.arriveDate,
    client: document.client,
    receiver: document.receiver,
    receipt: document.receipt,
  };
}

function compareIncomingDocuments(a: DashboardRecentDocument, b: DashboardRecentDocument) {
  const arriveCompare = (a.arriveDate || '').localeCompare(b.arriveDate || '');
  if (arriveCompare !== 0) {
    return arriveCompare;
  }

  return (a.issueNo || '').localeCompare(b.issueNo || '');
}

function toDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getWeekRange(baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function isReceiptCompleted(receipt: string) {
  return receipt.trim().includes('완료');
}
