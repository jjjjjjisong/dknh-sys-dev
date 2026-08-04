import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchOrderBookPage } from '../api/order-book';
import {
  fetchShippingScheduleDrafts,
  saveShippingScheduleDraft,
  type ShippingScheduleDraft,
} from '../api/shippingScheduleDrafts';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import type { OrderBookEntry, OrderBookShippingStatus } from '../types/order-book';
import { exportShippingScheduleToExcel } from '../utils/shippingScheduleExcel';

type ShippingFilter = 'all' | OrderBookShippingStatus;
type ShippingGroup = {
  receiver: string;
  entries: OrderBookEntry[];
};
type ShippingDateGroup = {
  date: string;
  entries: OrderBookEntry[];
  pallet: ReturnType<typeof sumNullable>;
  box: ReturnType<typeof sumNullable>;
  qty: number;
};

const PAGE_SIZE = 1000;
const UNASSIGNED_RECEIVER = '수신처 미지정';
const DEFAULT_RECEIVERS = ['(주)동국프라텍', '(주)팔도테크팩'];
const today = toDateInputValue(new Date());

export default function ShippingSchedulePage() {
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [shippingFilter, setShippingFilter] = useState<ShippingFilter>('all');
  const [selectedReceivers, setSelectedReceivers] = useState<string[]>(DEFAULT_RECEIVERS);
  const [activeReceiver, setActiveReceiver] = useState(DEFAULT_RECEIVERS[0]);
  const [receiverMenuOpen, setReceiverMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [entries, setEntries] = useState<OrderBookEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ShippingScheduleDraft>>({});
  const [savingDraftIds, setSavingDraftIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const receiverMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!receiverMenuRef.current?.contains(event.target as Node)) setReceiverMenuOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    async function loadEntries() {
      try {
        setLoading(true);
        setError(null);
        const [result, savedDrafts] = await Promise.all([
          fetchOrderBookPage({
            page: 1,
            pageSize: PAGE_SIZE,
            dateFrom,
            dateTo,
            shippingFilter,
          }),
          fetchShippingScheduleDrafts(dateFrom, dateTo),
        ]);
        if (requestId !== loadRequestIdRef.current) return;
        setEntries(result.items.filter((entry) => entry.status !== 'ST01'));
        setDrafts(savedDrafts);
      } catch (err) {
        if (requestId !== loadRequestIdRef.current) return;
        setError(err instanceof Error ? err.message : '출고 일정을 불러오지 못했습니다.');
      } finally {
        if (requestId === loadRequestIdRef.current) setLoading(false);
      }
    }

    void loadEntries();
  }, [dateFrom, dateTo, shippingFilter]);

  const receiverOptions = useMemo(() => (
    Array.from(new Set(entries.map(getReceiverLabel))).sort((left, right) => left.localeCompare(right, 'ko-KR'))
  ), [entries]);

  const visibleEntries = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('ko-KR');
    return [...entries]
      .filter((entry) => selectedReceivers.includes(getReceiverLabel(entry)))
      .filter((entry) => {
        if (!normalizedKeyword) return true;
        return [entry.issueNo, entry.receiver, entry.client, entry.product]
          .some((value) => value.toLocaleLowerCase('ko-KR').includes(normalizedKeyword));
      })
      .sort((left, right) => {
        const receiverCompare = getReceiverLabel(left).localeCompare(getReceiverLabel(right), 'ko-KR');
        if (receiverCompare !== 0) return receiverCompare;
        const dateCompare = (left.deadline ?? '').localeCompare(right.deadline ?? '');
        if (dateCompare !== 0) return dateCompare;
        const clientCompare = left.client.localeCompare(right.client, 'ko-KR');
        if (clientCompare !== 0) return clientCompare;
        return left.product.localeCompare(right.product, 'ko-KR');
      });
  }, [entries, keyword, selectedReceivers]);

  const groups = useMemo<ShippingGroup[]>(() => {
    const grouped = new Map<string, OrderBookEntry[]>();
    visibleEntries.forEach((entry) => {
      const receiver = getReceiverLabel(entry);
      grouped.set(receiver, [...(grouped.get(receiver) ?? []), entry]);
    });

    return Array.from(grouped, ([receiver, groupEntries]) => ({ receiver, entries: groupEntries }));
  }, [visibleEntries]);

  useEffect(() => {
    if (!groups.some((group) => group.receiver === activeReceiver)) {
      setActiveReceiver(groups[0]?.receiver ?? '');
    }
  }, [activeReceiver, groups]);

  const activeGroup = groups.find((group) => group.receiver === activeReceiver) ?? null;
  const activeDateGroups = useMemo(
    () => groupEntriesByDate(activeGroup?.entries ?? []),
    [activeGroup],
  );
  const dispatches = useMemo(() => Object.fromEntries(
    entries.map((entry) => [entry.id, drafts[entry.id]?.dispatch ?? entry.releaseNote]),
  ), [drafts, entries]);
  const notes = useMemo(() => Object.fromEntries(
    entries.map((entry) => [entry.id, drafts[entry.id]?.note ?? '']),
  ), [drafts, entries]);

  function toggleReceiver(receiver: string) {
    setSelectedReceivers((current) => (
      current.includes(receiver)
        ? current.filter((value) => value !== receiver)
        : [...current, receiver]
    ));
  }

  function updateDraft(entry: OrderBookEntry, field: keyof ShippingScheduleDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [entry.id]: {
        dispatch: current[entry.id]?.dispatch ?? entry.releaseNote,
        note: current[entry.id]?.note ?? '',
        [field]: value,
      },
    }));
  }

  async function persistDraft(entry: OrderBookEntry, field: keyof ShippingScheduleDraft, value: string) {
    const nextDraft = {
      dispatch: drafts[entry.id]?.dispatch ?? entry.releaseNote,
      note: drafts[entry.id]?.note ?? '',
      [field]: value,
    };

    try {
      setSavingDraftIds((current) => [...new Set([...current, entry.id])]);
      setError(null);
      await saveShippingScheduleDraft(entry.id, entry.deadline ?? dateFrom, nextDraft);
      setDrafts((current) => ({ ...current, [entry.id]: nextDraft }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '배차·비고 저장에 실패했습니다.');
    } finally {
      setSavingDraftIds((current) => current.filter((id) => id !== entry.id));
    }
  }

  return (
    <div className="page-content shipping-schedule-page">
      <div className="shipping-schedule-screen-only">
        <PageHeader title="출고 일정" description="" />
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <section className="card shipping-schedule-filter-card shipping-schedule-screen-only">
        <div className="shipping-schedule-period-grid">
          <label className="field">
            <span>입고 예정일(시작)</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                if (!event.target.value) return;
                setDateFrom(event.target.value);
                if (event.target.value > dateTo) setDateTo(event.target.value);
              }}
            />
          </label>

          <label className="field">
            <span>입고 예정일(종료)</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => {
                if (!event.target.value) return;
                setDateTo(event.target.value);
                if (event.target.value < dateFrom) setDateFrom(event.target.value);
              }}
            />
          </label>

          <label className="field">
            <span>출고 상태</span>
            <select value={shippingFilter} onChange={(event) => setShippingFilter(event.target.value as ShippingFilter)}>
              <option value="all">전체</option>
              <option value="미출고">미출고</option>
              <option value="출고">출고</option>
            </select>
          </label>

          <div className="field shipping-receiver-multi-field" ref={receiverMenuRef}>
            <span>수신처</span>
            <div className="shipping-receiver-multi-trigger">
              <div className="shipping-receiver-selected-values">
                {selectedReceivers.length === 0 ? (
                  <span className="shipping-receiver-placeholder">수신처 선택</span>
                ) : selectedReceivers.map((receiver) => (
                  <span key={receiver} className="shipping-receiver-chip">
                    <span>{receiver}</span>
                    <button type="button" onClick={() => toggleReceiver(receiver)} aria-label={`${receiver} 선택 해제`}>×</button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="shipping-receiver-menu-button"
                onClick={() => setReceiverMenuOpen((open) => !open)}
                aria-label="수신처 선택 목록 열기"
                aria-expanded={receiverMenuOpen}
              >
                <span className="shipping-receiver-multi-caret" aria-hidden="true" />
              </button>
            </div>
            {receiverMenuOpen ? (
              <div className="shipping-receiver-multi-menu">
                {receiverOptions.length === 0 ? (
                  <div className="shipping-receiver-multi-empty">조회된 수신처가 없습니다.</div>
                ) : receiverOptions.map((receiver) => (
                  <label key={receiver} className="shipping-receiver-multi-option">
                    <input
                      type="checkbox"
                      checked={selectedReceivers.includes(receiver)}
                      onChange={() => toggleReceiver(receiver)}
                    />
                    <span>{receiver}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <label className="field shipping-schedule-keyword-field">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="발급번호, 거래처, 수신처, 품목 검색"
            />
          </label>
        </div>
      </section>

      <section className="card shipping-schedule-sheet">
        <div className="shipping-schedule-list-header">
          <div className="shipping-schedule-sheet-heading">
            <h2>{formatDateRange(dateFrom, dateTo)} 출고 일정</h2>
          </div>
          <div className="history-toolbar shipping-schedule-actions shipping-schedule-screen-only">
            <Button
              type="button"
              className="excel-download-button"
              onClick={() => void exportShippingScheduleToExcel(visibleEntries, dateFrom, dateTo, dispatches, notes)}
              disabled={visibleEntries.length === 0}
            >
              엑셀 다운로드
            </Button>
            <Button type="button" onClick={() => window.print()} disabled={!activeGroup}>인쇄</Button>
          </div>
        </div>

        {!loading && groups.length > 0 ? (
          <div className="shipping-receiver-tabs shipping-schedule-screen-only" role="tablist" aria-label="수신처별 출고 일정">
            {groups.map((group) => (
              <button
                key={group.receiver}
                type="button"
                role="tab"
                aria-selected={group.receiver === activeReceiver}
                className={group.receiver === activeReceiver ? 'active' : ''}
                onClick={() => setActiveReceiver(group.receiver)}
              >
                {group.receiver}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="shipping-schedule-empty">출고 일정을 불러오는 중입니다...</div>
        ) : !activeGroup ? (
          <div className="shipping-schedule-empty">선택한 기간과 수신처의 출고 일정이 없습니다.</div>
        ) : (
          <section className="shipping-receiver-group">
            <div className="shipping-receiver-print-title">{activeGroup.receiver}</div>
            <div className="shipping-date-groups">
              {activeDateGroups.map((dateGroup) => (
                <section key={dateGroup.date} className="shipping-date-group">
                  <h3>{formatDateHeading(dateGroup.date)}</h3>
                  <div className="table-wrap">
                    <table className="table shipping-schedule-table shipping-schedule-period-table">
                      <thead>
                        <tr>
                          <th>발급번호</th>
                          <th>거래처</th>
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
                        {dateGroup.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td>{entry.issueNo || '-'}</td>
                            <td className="shipping-client-cell">{entry.client || '-'}</td>
                            <td className="shipping-product-cell">{entry.product || '-'}</td>
                            <td className="shipping-number-cell">{formatNullableNumber(entry.pallet)}</td>
                            <td className="shipping-number-cell">{formatNullableNumber(entry.box)}</td>
                            <td className="shipping-number-cell shipping-qty-cell">{formatNumber(entry.qty)}</td>
                            <td className="shipping-dispatch-cell">
                              <input
                                value={dispatches[entry.id] ?? entry.releaseNote}
                                onChange={(event) => updateDraft(entry, 'dispatch', event.target.value)}
                                onBlur={(event) => void persistDraft(entry, 'dispatch', event.target.value)}
                                aria-busy={savingDraftIds.includes(entry.id)}
                                aria-label={`${activeGroup.receiver} ${entry.client} 배차`}
                              />
                            </td>
                            <td className="shipping-note-cell shipping-draft-cell">
                              <input
                                value={notes[entry.id] ?? ''}
                                onChange={(event) => updateDraft(entry, 'note', event.target.value)}
                                onBlur={(event) => void persistDraft(entry, 'note', event.target.value)}
                                aria-busy={savingDraftIds.includes(entry.id)}
                                aria-label={`${activeGroup.receiver} ${entry.client} 비고`}
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
                          <td className="shipping-number-cell">{formatNullableTotal(dateGroup.pallet)}</td>
                          <td className="shipping-number-cell">{formatNullableTotal(dateGroup.box)}</td>
                          <td className="shipping-number-cell">{formatNumber(dateGroup.qty)}</td>
                          <td colSpan={2} />
                          <td className="shipping-schedule-screen-only" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </section>
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

function groupEntriesByDate(entries: OrderBookEntry[]): ShippingDateGroup[] {
  const grouped = new Map<string, OrderBookEntry[]>();
  entries.forEach((entry) => {
    const date = entry.deadline ?? '날짜 미지정';
    grouped.set(date, [...(grouped.get(date) ?? []), entry]);
  });
  return Array.from(grouped, ([date, dateEntries]) => ({
    date,
    entries: dateEntries,
    pallet: sumNullable(dateEntries.map((entry) => entry.pallet)),
    box: sumNullable(dateEntries.map((entry) => entry.box)),
    qty: dateEntries.reduce((sum, entry) => sum + entry.qty, 0),
  }));
}

function formatDateHeading(value: string) {
  if (value === '날짜 미지정') return value;
  const [, month, day] = value.split('-').map(Number);
  return `${month}월 ${day}일`;
}

function formatDateRange(dateFrom: string, dateTo: string) {
  if (dateFrom === dateTo) return formatKoreanDate(dateFrom);
  return `${formatKoreanDate(dateFrom)} ~ ${formatKoreanDate(dateTo)}`;
}

function formatKoreanDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
