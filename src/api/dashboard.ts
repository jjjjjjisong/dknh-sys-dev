import { getSupabaseClient } from './supabase/client';
import type {
  DashboardArrivalTrend,
  DashboardIncomingDocument,
  DashboardRecentDocument,
  DashboardSummary,
} from '../types/dashboard';
import type { OrderBookShippingStatus, OrderBookStatus } from '../types/order-book';

type DocumentItemRow = {
  id: string | number | null;
  name1: string | null;
  name2: string | null;
  qty: number | null;
  arrive_date: string | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  custom_pallet: number | null;
  custom_box: number | null;
  del_yn: string | null;
};

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
  cancelled: boolean | null;
  del_yn: string | null;
  document_items: DocumentItemRow[] | null;
};

type OrderBookRow = {
  id: string;
  issue_no: string | null;
  product: string | null;
  receipt: string | null;
  status: string | null;
  shipped_status: string | null;
  del_yn: string | null;
};

export async function fetchDashboardSummary(baseDate: Date = new Date()): Promise<DashboardSummary> {
  const supabase = getSupabaseClient();

  const [documentsResult, orderBookResult] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, issue_no, client, receiver, order_date, arrive_date, author, created_at, updated_at, status, cancelled, del_yn, document_items(id, name1, name2, qty, arrive_date, ea_per_b, box_per_p, custom_pallet, custom_box, del_yn)',
      )
      .eq('del_yn', 'N')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('order_book')
      .select('id, issue_no, product, receipt, status, shipped_status, del_yn')
      .eq('del_yn', 'N')
      .order('created_at', { ascending: false }),
  ]);

  if (documentsResult.error) throw documentsResult.error;
  if (orderBookResult.error) throw orderBookResult.error;

  const orderBookRows = (orderBookResult.data ?? []) as OrderBookRow[];
  const orderBookMap = new Map<string, OrderBookRow>();

  for (const row of orderBookRows) {
    const key = getOrderBookKey(row.issue_no, row.product);
    if (key) {
      orderBookMap.set(key, row);
    }
  }

  const today = new Date();
  const todayKey = toDateKey(today);
  const weekRange = getWeekRange(baseDate);

  const sourceDocuments = (documentsResult.data ?? []) as DocumentRow[];

  const recentDocuments: DashboardRecentDocument[] = sourceDocuments
    .filter((document) => mapStatus(document.status, document.cancelled) === 'ST00' && (document.del_yn ?? 'N') === 'N')
    .map((document) => {
      const items = (document.document_items ?? []).filter((item) => (item.del_yn ?? 'N') === 'N');
      const firstOrderBook = orderBookMap.get(getOrderBookKey(document.issue_no, items[0]?.name1 ?? ''));

      return {
        id: String(document.id ?? ''),
        issueNo: String(document.issue_no ?? ''),
        client: document.client ?? '',
        receiver: document.receiver ?? '',
        orderDate: document.order_date ?? '',
        arriveDate: document.arrive_date ?? '',
        author: document.author ?? '',
        createdAt: document.created_at ?? '',
        updatedAt: document.updated_at ?? '',
        status: mapStatus(document.status, document.cancelled),
        receipt: firstOrderBook?.receipt ?? '',
      };
    })
    .slice(0, 3);

  const incomingItems: DashboardIncomingDocument[] = sourceDocuments
    .filter((document) => mapStatus(document.status, document.cancelled) === 'ST00' && (document.del_yn ?? 'N') === 'N')
    .flatMap((document) =>
      (document.document_items ?? [])
        .filter((item) => (item.del_yn ?? 'N') === 'N')
        .map((item) => mapIncomingItem(document, item, orderBookMap)),
    )
    .sort(compareIncomingDocuments);

  const todayIncomingDocuments = incomingItems.filter((item) => item.arriveDate === todayKey);
  const weekIncomingDocuments = incomingItems.filter(
    (item) => item.arriveDate >= weekRange.start && item.arriveDate <= weekRange.end,
  );
  const unshippedDocuments = incomingItems.filter(
    (item) => item.status !== 'ST01' && item.shippedStatus === '미출고',
  );

  return {
    todayIncomingCount: todayIncomingDocuments.length,
    weekIncomingCount: weekIncomingDocuments.length,
    incompleteCount: unshippedDocuments.length,
    completedCount: incomingItems.filter((item) => item.shippedStatus === '출고').length,
    trackedCount: incomingItems.length,
    weekLabel: `${formatShortDate(weekRange.start)} - ${formatShortDate(weekRange.end)}`,
    todayLabel: formatShortDate(todayKey),
    todayIncomingDocuments,
    weekIncomingDocuments,
    incompleteDocuments: unshippedDocuments,
    recentDocuments,
    weeklyArrivals: buildWeeklyArrivals(weekRange, weekIncomingDocuments),
  };
}

export async function fetchDashboardWeeklyArrivals(
  baseDate: Date = new Date(),
): Promise<Pick<DashboardSummary, 'weekLabel' | 'weeklyArrivals'>> {
  const supabase = getSupabaseClient();

  const [documentsResult, orderBookResult] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, issue_no, client, receiver, order_date, arrive_date, author, created_at, updated_at, status, cancelled, del_yn, document_items(id, name1, name2, qty, arrive_date, ea_per_b, box_per_p, custom_pallet, custom_box, del_yn)',
      )
      .eq('del_yn', 'N')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('order_book')
      .select('id, issue_no, product, receipt, status, shipped_status, del_yn')
      .eq('del_yn', 'N')
      .order('created_at', { ascending: false }),
  ]);

  if (documentsResult.error) throw documentsResult.error;
  if (orderBookResult.error) throw orderBookResult.error;

  const orderBookRows = (orderBookResult.data ?? []) as OrderBookRow[];
  const orderBookMap = new Map<string, OrderBookRow>();

  for (const row of orderBookRows) {
    const key = getOrderBookKey(row.issue_no, row.product);
    if (key) {
      orderBookMap.set(key, row);
    }
  }

  const weekRange = getWeekRange(baseDate);
  const sourceDocuments = (documentsResult.data ?? []) as DocumentRow[];

  const incomingItems: DashboardIncomingDocument[] = sourceDocuments
    .filter(
      (document) => mapStatus(document.status, document.cancelled) === 'ST00' && (document.del_yn ?? 'N') === 'N',
    )
    .flatMap((document) =>
      (document.document_items ?? [])
        .filter((item) => (item.del_yn ?? 'N') === 'N')
        .map((item) => mapIncomingItem(document, item, orderBookMap)),
    )
    .sort(compareIncomingDocuments);

  const weekIncomingDocuments = incomingItems.filter(
    (item) => item.arriveDate >= weekRange.start && item.arriveDate <= weekRange.end,
  );

  return {
    weekLabel: `${formatShortDate(weekRange.start)} - ${formatShortDate(weekRange.end)}`,
    weeklyArrivals: buildWeeklyArrivals(weekRange, weekIncomingDocuments),
  };
}

function mapIncomingItem(
  document: DocumentRow,
  item: DocumentItemRow,
  orderBookMap: Map<string, OrderBookRow>,
): DashboardIncomingDocument {
  const qty = item.qty ?? 0;
  const arriveDate = item.arrive_date ?? document.arrive_date ?? '';
  const productName = item.name2?.trim() || item.name1?.trim() || '';
  const orderBook = orderBookMap.get(getOrderBookKey(document.issue_no, item.name1 ?? ''));

  return {
    id: String(item.id ?? `${document.id}-${productName}-${qty}`),
    documentId: String(document.id ?? ''),
    orderBookId: orderBook?.id ?? null,
    issueNo: String(document.issue_no ?? ''),
    arriveDate,
    productName,
    client: document.client ?? '',
    receiver: document.receiver ?? '',
    qty,
    pallet: calculatePallet(item, qty),
    box: calculateBox(item, qty),
    status: mapStatus(orderBook?.status ?? document.status, document.cancelled),
    shippedStatus: mapShippedStatus(orderBook?.shipped_status),
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

function calculatePallet(item: DocumentItemRow, qty: number) {
  if (item.custom_pallet !== null && item.custom_pallet !== undefined) {
    return item.custom_pallet;
  }

  const eaPerP = item.ea_per_b && item.box_per_p ? item.ea_per_b * item.box_per_p : null;
  return eaPerP ? Math.ceil(qty / eaPerP) : null;
}

function calculateBox(item: DocumentItemRow, qty: number) {
  if (item.custom_box !== null && item.custom_box !== undefined) {
    return item.custom_box;
  }

  return item.ea_per_b ? Math.ceil(qty / item.ea_per_b) : null;
}

function compareIncomingDocuments(a: DashboardIncomingDocument, b: DashboardIncomingDocument) {
  const arriveCompare = (a.arriveDate || '').localeCompare(b.arriveDate || '');
  if (arriveCompare !== 0) return arriveCompare;
  return (a.issueNo || '').localeCompare(b.issueNo || '');
}

function getOrderBookKey(issueNo: string | null | undefined, product: string | null | undefined) {
  const normalizedIssueNo = String(issueNo ?? '').trim();
  const normalizedProduct = String(product ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return normalizedIssueNo && normalizedProduct ? `${normalizedIssueNo}::${normalizedProduct}` : '';
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

function mapStatus(status: string | null | undefined, cancelled?: boolean | null): OrderBookStatus {
  if (status === 'ST01') return 'ST01';
  if (status === 'ST00') return 'ST00';
  return cancelled ? 'ST01' : 'ST00';
}

function mapShippedStatus(value: string | null | undefined): OrderBookShippingStatus {
  return value === '출고' ? '출고' : '미출고';
}
