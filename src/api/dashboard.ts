import { getSupabaseClient } from './supabase/client';
import type {
  DashboardArrivalTrend,
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
        'id, issue_no, client, receiver, order_date, arrive_date, author, created_at, updated_at, cancelled, del_yn',
      )
      .eq('del_yn', 'N')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('order_book')
      .select('issue_no, receipt, cancelled, from_doc, created_at, del_yn')
      .eq('del_yn', 'N')
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
    .filter((document: any) => !(document.cancelled ?? false) && (document.del_yn ?? 'N') === 'N')
    .map((document: any) => {
      const issueNo = String(document.issue_no ?? '').trim();
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
        document.arriveDate <= weekRange.end,
    )
    .sort(compareIncomingDocuments)
    .map(mapIncomingDocument);

  const incompleteDocuments = mappedDocuments
    .filter((document) => !isReceiptCompleted(document.receipt))
    .sort(compareIncomingDocuments)
    .map(mapIncomingDocument);

  const trackedCount = mappedDocuments.length;
  const completedCount = Math.max(trackedCount - incompleteDocuments.length, 0);

  return {
    todayIncomingCount: todayIncomingDocuments.length,
    weekIncomingCount: weekIncomingDocuments.length,
    incompleteCount: incompleteDocuments.length,
    completedCount,
    trackedCount,
    todayLabel: formatShortDate(todayKey),
    weekLabel: `${formatShortDate(weekRange.start)} - ${formatShortDate(weekRange.end)}`,
    todayIncomingDocuments,
    weekIncomingDocuments,
    incompleteDocuments,
    recentDocuments: mappedDocuments.slice(0, 3),
    weeklyArrivals: buildWeeklyArrivals(weekRange, weekIncomingDocuments),
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

function buildWeeklyArrivals(
  weekRange: { dates: string[] },
  documents: DashboardIncomingDocument[],
): DashboardArrivalTrend[] {
  return weekRange.dates.map((date) => {
    const items = documents.filter((document) => document.arriveDate === date);
    return {
      date,
      label: getWeekdayLabel(date),
      count: items.length,
      documents: items,
    };
  });
}

function compareIncomingDocuments(
  a: DashboardRecentDocument | DashboardIncomingDocument,
  b: DashboardRecentDocument | DashboardIncomingDocument,
) {
  const arriveCompare = (a.arriveDate || '').localeCompare(b.arriveDate || '');
  if (arriveCompare !== 0) return arriveCompare;
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

  const dates = Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return toDateKey(current);
  });

  return {
    start: dates[0],
    end: dates[6],
    dates,
  };
}

function getWeekdayLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ko-KR', { weekday: 'short' });
}

function formatShortDate(value: string) {
  const [, month, day] = value.split('-').map(Number);
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}

function isReceiptCompleted(receipt: string) {
  return receipt.trim().includes('완료');
}
