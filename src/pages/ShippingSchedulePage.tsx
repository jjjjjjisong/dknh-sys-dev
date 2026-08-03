import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchOrderBookPage } from '../api/order-book';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import type { OrderBookEntry, OrderBookShippingStatus } from '../types/order-book';
import { exportShippingScheduleToExcel } from '../utils/shippingScheduleExcel';

type ShippingFilter = 'all' | OrderBookShippingStatus;
type ShippingGroup = {
  receiver: string;
  entries: OrderBookEntry[];
  pallet: ReturnType<typeof sumNullable>;
  box: ReturnType<typeof sumNullable>;
  qty: number;
};

const PAGE_SIZE = 1000;
const ALL_RECEIVERS = 'all';
const UNASSIGNED_RECEIVER = '수신처 미지정';
const today = toDateInputValue(new Date());

export default function ShippingSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [shippingFilter, setShippingFilter] = useState<ShippingFilter>('all');
  const [receiverFilter, setReceiverFilter] = useState(ALL_RECEIVERS);
  const [keyword, setKeyword] = useState('');
  const [entries, setEntries] = useState<OrderBookEntry[]>([]);
  const [dispatches, setDispatches] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    const savedDispatches = window.localStorage.getItem(getDraftStorageKey('dispatch', selectedDate));
    const savedNotes = window.localStorage.getItem(getDraftStorageKey('note', selectedDate));
    setDispatches(savedDispatches ? safelyParseDrafts(savedDispatches) : {});
    setNotes(savedNotes ? safelyParseDrafts(savedNotes) : {});
  }, [selectedDate]);

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    async function loadEntries() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchOrderBookPage({
          page: 1,
          pageSize: PAGE_SIZE,
          dateFrom: selectedDate,
          dateTo: selectedDate,
          shippingFilter,
        });
        if (requestId !== loadRequestIdRef.current) return;
        setEntries(result.items.filter((entry) => entry.status !== 'ST01'));
      } catch (err) {
        if (requestId !== loadRequestIdRef.current) return;
        setError(err instanceof Error ? err.message : '출고 일정을 불러오지 못했습니다.');
      } finally {
        if (requestId === loadRequestIdRef.current) setLoading(false);
      }
    }

    void loadEntries();
  }, [selectedDate, shippingFilter]);

  const receiverOptions = useMemo(() => (
    Array.from(new Set(entries.map(getReceiverLabel))).sort((left, right) => left.localeCompare(right, 'ko-KR'))
  ), [entries]);

  useEffect(() => {
    if (receiverFilter !== ALL_RECEIVERS && !receiverOptions.includes(receiverFilter)) {
      setReceiverFilter(ALL_RECEIVERS);
    }
  }, [receiverFilter, receiverOptions]);

  const visibleEntries = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('ko-KR');
    return [...entries]
      .filter((entry) => receiverFilter === ALL_RECEIVERS || getReceiverLabel(entry) === receiverFilter)
      .filter((entry) => {
        if (!normalizedKeyword) return true;
        return [entry.receiver, entry.client, entry.product, entry.issueNo]
          .some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedKeyword));
      })
      .sort((left, right) => {
        const receiverCompare = getReceiverLabel(left).localeCompare(getReceiverLabel(right), 'ko-KR');
        if (receiverCompare !== 0) return receiverCompare;
        const clientCompare = left.client.localeCompare(right.client, 'ko-KR');
        if (clientCompare !== 0) return clientCompare;
        return left.product.localeCompare(right.product, 'ko-KR');
      });
  }, [entries, keyword, receiverFilter]);

  const groups = useMemo<ShippingGroup[]>(() => {
    const grouped = new Map<string, OrderBookEntry[]>();
    visibleEntries.forEach((entry) => {
      const receiver = getReceiverLabel(entry);
      grouped.set(receiver, [...(grouped.get(receiver) ?? []), entry]);
    });

    return Array.from(grouped, ([receiver, groupEntries]) => ({
      receiver,
      entries: groupEntries,
      pallet: sumNullable(groupEntries.map((entry) => entry.pallet)),
      box: sumNullable(groupEntries.map((entry) => entry.box)),
      qty: groupEntries.reduce((sum, entry) => sum + entry.qty, 0),
    }));
  }, [visibleEntries]);

  const totals = useMemo(() => ({
    receivers: groups.length,
    pallet: sumNullable(visibleEntries.map((entry) => entry.pallet)),
    box: sumNullable(visibleEntries.map((entry) => entry.box)),
    qty: visibleEntries.reduce((sum, entry) => sum + entry.qty, 0),
  }), [groups.length, visibleEntries]);

  function moveDate(days: number) {
    const next = new Date(`${selectedDate}T00:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(toDateInputValue(next));
  }

  function updateDispatch(id: string, value: string) {
    setDispatches((current) => {
      const next = { ...current, [id]: value };
      try {
        window.localStorage.setItem(getDraftStorageKey('dispatch', selectedDate), JSON.stringify(next));
      } catch {
        // The current screen still keeps the draft when browser storage is unavailable.
      }
      return next;
    });
  }

  function updateNote(id: string, value: string) {
    setNotes((current) => {
      const next = { ...current, [id]: value };
      try {
        window.localStorage.setItem(getDraftStorageKey('note', selectedDate), JSON.stringify(next));
      } catch {
        // The current screen still keeps the draft when browser storage is unavailable.
      }
      return next;
    });
  }

  return (
    <div className="page-content shipping-schedule-page">
      <div className="shipping-schedule-screen-only">
        <PageHeader title="출고 일정" description="" />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <section className="card shipping-schedule-filter-card shipping-schedule-screen-only">
        <div className="shipping-schedule-filter-grid shipping-schedule-filter-grid-wide">
          <label className="field">
            <span>입고 예정일</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) setSelectedDate(event.target.value);
              }}
            />
          </label>

          <label className="field">
            <span>출고 상태</span>
            <select
              className="history-filter-select"
              value={shippingFilter}
              onChange={(event) => setShippingFilter(event.target.value as ShippingFilter)}
            >
              <option value="all">전체</option>
              <option value="미출고">미출고</option>
              <option value="출고">출고</option>
            </select>
          </label>

          <label className="field">
            <span>수신처</span>
            <select
              className="history-filter-select"
              value={receiverFilter}
              onChange={(event) => setReceiverFilter(event.target.value)}
            >
              <option value={ALL_RECEIVERS}>전체 수신처</option>
              {receiverOptions.map((receiver) => (
                <option key={receiver} value={receiver}>{receiver}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="거래처, 수신처, 품목 검색"
            />
          </label>

          <div className="shipping-schedule-date-actions">
            <Button type="button" size="small" onClick={() => moveDate(-1)}>이전날</Button>
            <Button type="button" size="small" onClick={() => setSelectedDate(today)}>오늘</Button>
            <Button type="button" size="small" onClick={() => moveDate(1)}>다음날</Button>
          </div>
        </div>
      </section>

      <section className="card shipping-schedule-sheet">
        <div className="shipping-schedule-list-header">
          <div className="shipping-schedule-sheet-heading">
            <h2>{formatKoreanDate(selectedDate)} 출고 일정</h2>
            <p>
              {shippingFilter === 'all' ? '전체' : shippingFilter} {formatNumber(visibleEntries.length)}건 · 수신처 {formatNumber(totals.receivers)}곳 · 파렛트 {formatNullableTotal(totals.pallet)} · BOX {formatNullableTotal(totals.box)} · 수량 {formatNumber(totals.qty)}
            </p>
          </div>
          <div className="history-toolbar shipping-schedule-actions shipping-schedule-screen-only">
            <Button
              type="button"
              className="excel-download-button"
              onClick={() => void exportShippingScheduleToExcel(visibleEntries, selectedDate, dispatches, notes, receiverFilter)}
              disabled={visibleEntries.length === 0}
            >
              엑셀 다운로드
            </Button>
            <Button type="button" onClick={() => window.print()} disabled={visibleEntries.length === 0}>인쇄</Button>
          </div>
        </div>

        {loading ? (
          <div className="shipping-schedule-empty">출고 일정을 불러오는 중입니다...</div>
        ) : groups.length === 0 ? (
          <div className="shipping-schedule-empty">선택한 조건의 출고 일정이 없습니다.</div>
        ) : (
          <div className="shipping-schedule-groups">
            {groups.map((group) => (
              <section key={group.receiver} className="shipping-receiver-group">
                <div className="shipping-receiver-title">
                  <div>
                    <span>수신처</span>
                    <h3>{group.receiver}</h3>
                  </div>
                  <p>{formatNumber(group.entries.length)}건 · 파렛트 {formatNullableTotal(group.pallet)} · BOX {formatNullableTotal(group.box)} · 수량 {formatNumber(group.qty)}</p>
                </div>

                <div className="table-wrap">
                  <table className="table shipping-schedule-table shipping-schedule-group-table">
                    <thead>
                      <tr>
                        <th>거래처</th>
                        <th>일자</th>
                        <th>품목</th>
                        <th>파렛트</th>
                        <th>BOX 수</th>
                        <th>수량</th>
                        <th>배차</th>
                        <th>비고</th>
                        <th className="shipping-schedule-screen-only">출고상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.entries.map((entry) => (
                        <tr key={entry.id} className={entry.shippedStatus === '출고' ? 'is-shipped' : ''}>
                          <td className="shipping-client-cell">{entry.client || '-'}</td>
                          <td className="shipping-date-cell">{getDay(entry.deadline)}</td>
                          <td className="shipping-product-cell">{entry.product || '-'}</td>
                          <td className="shipping-number-cell">{formatNullableNumber(entry.pallet)}</td>
                          <td className="shipping-number-cell">{formatNullableNumber(entry.box)}</td>
                          <td className="shipping-number-cell shipping-qty-cell">{formatNumber(entry.qty)}</td>
                          <td className="shipping-dispatch-cell">
                            <input
                              value={dispatches[entry.id] ?? ''}
                              onChange={(event) => updateDispatch(entry.id, event.target.value)}
                              aria-label={`${group.receiver} ${entry.client} 배차`}
                            />
                          </td>
                          <td className="shipping-note-cell shipping-draft-cell">
                            <input
                              value={notes[entry.id] ?? ''}
                              onChange={(event) => updateNote(entry.id, event.target.value)}
                              aria-label={`${group.receiver} ${entry.client} 비고`}
                            />
                          </td>
                          <td className="shipping-status-cell shipping-schedule-screen-only">
                            <span className={`shipping-status-badge ${entry.shippedStatus === '출고' ? 'is-complete' : ''}`}>{entry.shippedStatus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>합계</td>
                        <td className="shipping-number-cell">{formatNullableTotal(group.pallet)}</td>
                        <td className="shipping-number-cell">{formatNullableTotal(group.box)}</td>
                        <td className="shipping-number-cell">{formatNumber(group.qty)}</td>
                        <td colSpan={2} />
                        <td className="shipping-schedule-screen-only" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getReceiverLabel(entry: OrderBookEntry) {
  return entry.receiver.trim() || UNASSIGNED_RECEIVER;
}

function sumNullable(values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null && value !== undefined);
  return { value: available.reduce((sum, value) => sum + value, 0), complete: available.length === values.length };
}

function formatNullableTotal(total: { value: number; complete: boolean }) {
  if (total.value === 0 && !total.complete) return '-';
  return `${formatNumber(total.value)}${total.complete ? '' : '+'}`;
}

function formatNullableNumber(value: number | null) {
  return value === null || value === undefined ? '-' : formatNumber(value);
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function getDay(value: string | null) {
  return value ? String(Number(value.slice(-2))) : '-';
}

function formatKoreanDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(new Date(`${value}T00:00:00`));
  return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDraftStorageKey(type: 'dispatch' | 'note', date: string) {
  return `shipping-schedule-${type}:${date}`;
}

function safelyParseDrafts(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}
