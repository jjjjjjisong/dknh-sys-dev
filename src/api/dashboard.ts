import { fetchOrderBook } from './order-book';
import { getSupabaseClient } from './supabase/client';
import type {
  DashboardArrivalTrend,
  DashboardIncomingDocument,
  DashboardRecentDocument,
  DashboardSummary,
} from '../types/dashboard';
import type { OrderBookEntry, OrderBookShippingStatus, OrderBookStatus } from '../types/order-book';

type DocumentRow = {
  id: string | number | null;
  issue_no: string | null;
  client: string | null;
  receiver: string | null;
  order_date: string | null;
  arrive_date: string | null;
  author: string | null;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
  del_yn: string | null;
};

const UNSHIPPED_STATUS = '미출고' as OrderBookShippingStatus;

export async function fetchDashboardSummary(baseDate: Date = new Date()): Promise<DashboardSummary> {
  const supabase = getSupabaseClient();

  const [documentsResult, orderBookEntries] = await Promise.all([
    supabase
      .from('documents')
      .select('id, issue_no, client, receiver, order_date, arrive_date, author, created_at, updated_at, status, del_yn')
      .eq('del_yn', 'N')
      .order('created_at', { ascending: false })
      .limit(300),
    fetchOrderBook(),
  ]);

  if (documentsResult.error) throw documentsResult.error;

  const todayKey = toDateKey(baseDate);
  const weekRange = getWeekRange(baseDate);
  const recentDocuments = buildRecentDocuments(
    (documentsResult.data ?? []) as DocumentRow[],
    orderBookEntries,
  );
  const incomingItems = buildIncomingItems(orderBookEntries);

  const todayIncomingDocuments = incomingItems.filter((item) => item.arriveDate === todayKey);
  const todayIncompleteDocuments = todayIncomingDocuments.filter(
    (item) => item.shippedStatus === UNSHIPPED_STATUS,
  );
  const delayedDocuments = incomingItems.filter(
    (item) => item.arriveDate < todayKey && item.shippedStatus === UNSHIPPED_STATUS,
  );
  const weekIncomingDocuments = incomingItems.filter(
    (item) => item.arriveDate >= weekRange.start && item.arriveDate <= weekRange.end,
  );

  return {
    todayIncomingCount: todayIncomingDocuments.length,
    todayIncompleteCount: todayIncompleteDocuments.length,
    delayedCount: delayedDocuments.length,
    weekLabel: `${formatShortDate(weekRange.start)} - ${formatShortDate(weekRange.end)}`,
    todayLabel: formatShortDate(todayKey),
    todayIncomingDocuments,
    todayIncompleteDocuments,
    delayedDocuments,
    recentDocuments,
    weeklyArrivals: buildWeeklyArrivals(weekRange, weekIncomingDocuments),
  };
}

export async function fetchDashboardWeeklyArrivals(
  baseDate: Date = new Date(),
): Promise<Pick<DashboardSummary, 'weekLabel' | 'weeklyArrivals'>> {
  const weekRange = getWeekRange(baseDate);
  const incomingItems = buildIncomingItems(await fetchOrderBook());
  const weekIncomingDocuments = incomingItems.filter(
    (item) => item.arriveDate >= weekRange.start && item.arriveDate <= weekRange.end,
  );

  return {
    weekLabel: `${formatShortDate(weekRange.start)} - ${formatShortDate(weekRange.end)}`,
    weeklyArrivals: buildWeeklyArrivals(weekRange, weekIncomingDocuments),
  };
}

function buildRecentDocuments(
  documents: DocumentRow[],
  orderBookEntries: OrderBookEntry[],
): DashboardRecentDocument[] {
  const receiptByDocId = new Map<string, string>();

  for (const entry of orderBookEntries) {
    if (!entry.docId || receiptByDocId.has(entry.docId)) continue;
    if (entry.receipt) {
      receiptByDocId.set(entry.docId, entry.receipt);
    }
  }

  return documents
    .filter((document) => mapStatus(document.status) === 'ST00' && (document.del_yn ?? 'N') === 'N')
    .map((document) => ({
      id: String(document.id ?? ''),
      issueNo: String(document.issue_no ?? ''),
      client: document.client ?? '',
      receiver: document.receiver ?? '',
      orderDate: document.order_date ?? '',
      arriveDate: document.arrive_date ?? '',
      author: document.author ?? '',
      createdAt: document.created_at ?? '',
      updatedAt: document.updated_at ?? '',
      status: mapStatus(document.status),
      receipt: receiptByDocId.get(String(document.id ?? '')) ?? '',
    }))
    .slice(0, 3);
}

function buildIncomingItems(orderBookEntries: OrderBookEntry[]): DashboardIncomingDocument[] {
  return orderBookEntries
    .filter((entry) => entry.delYn === 'N' && Boolean(entry.deadline))
    .map(mapIncomingOrderBook)
    .sort(compareIncomingDocuments);
}

function mapIncomingOrderBook(entry: OrderBookEntry): DashboardIncomingDocument {
  return {
    id: entry.id,
    documentId: entry.docId ?? '',
    orderBookId: entry.id,
    issueNo: entry.issueNo ?? '',
    arriveDate: entry.deadline ?? '',
    productName: entry.product ?? '',
    client: entry.client ?? '',
    receiver: entry.receiver ?? '',
    qty: entry.qty ?? 0,
    pallet: entry.pallet,
    box: entry.box,
    status: entry.status,
    shippedStatus: entry.shippedStatus,
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
      label: formatTrendLabel(date),
      count: items.length,
      documents: items,
    };
  });
}

function compareIncomingDocuments(a: DashboardIncomingDocument, b: DashboardIncomingDocument) {
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

function formatTrendLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${String(day).padStart(2, '0')}(${weekday})`;
}

function formatShortDate(value: string) {
  const [, month, day] = value.split('-').map(Number);
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}

function mapStatus(status: string | null | undefined): OrderBookStatus {
  if (status === 'ST01') return 'ST01';
  if (status === 'ST00') return 'ST00';
  return 'ST00';
}
