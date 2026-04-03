import { useEffect, useMemo, useState } from 'react';
import { fetchOrderBook } from '../../api/order-book';
import type { OrderBookEntry } from '../../types/order-book';
import Modal from '../ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

type CalendarDay = {
  key: string;
  date: Date;
  inMonth: boolean;
};

export default function ScheduleCalendarModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<OrderBookEntry[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchOrderBook();
        if (!mounted) return;
        setEntries(rows.filter((row) => Boolean(row.deadline)));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '일정 데이터를 불러오지 못했습니다.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    setMonthCursor(startOfMonth(today));
    setSelectedDate(toDateKey(today));
  }, [open]);

  const monthDays = useMemo(() => buildMonthDays(monthCursor), [monthCursor]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, OrderBookEntry[]>();

    for (const entry of entries) {
      if (!entry.deadline) continue;
      const current = map.get(entry.deadline) ?? [];
      current.push(entry);
      map.set(entry.deadline, current);
    }

    for (const [, rows] of map) {
      rows.sort((a, b) => {
        const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : Number.NaN;
        const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : Number.NaN;
        const hasCreatedAtA = Number.isFinite(createdAtA);
        const hasCreatedAtB = Number.isFinite(createdAtB);

        if (hasCreatedAtA && hasCreatedAtB && createdAtA !== createdAtB) {
          return createdAtA - createdAtB;
        }

        if (hasCreatedAtA !== hasCreatedAtB) {
          return hasCreatedAtA ? -1 : 1;
        }

        const issueCompare = (a.issueNo || '').localeCompare(b.issueNo || '');
        if (issueCompare !== 0) return issueCompare;
        return (a.product || '').localeCompare(b.product || '');
      });
    }

    return map;
  }, [entries]);

  const selectedItems = entriesByDate.get(selectedDate) ?? [];

  function moveMonth(offset: number) {
    const next = startOfMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1));
    setMonthCursor(next);

    const today = new Date();
    const fallbackDate =
      today.getFullYear() === next.getFullYear() && today.getMonth() === next.getMonth()
        ? toDateKey(today)
        : toDateKey(next);
    setSelectedDate(fallbackDate);
  }

  return (
    <Modal
      open={open}
      title="월간 일정"
      description="수주대장의 입고예정일 기준으로 월간 일정을 확인합니다."
      onClose={onClose}
      headerAction={
        <button type="button" className="schedule-calendar-close-button" onClick={onClose} aria-label="닫기">
          ×
        </button>
      }
      cardClassName="schedule-calendar-modal-card"
      overlayClassName="schedule-calendar-modal-overlay"
      closeOnOverlayClick
    >
      <div className="schedule-calendar-layout">
        <section className="schedule-calendar-panel">
          <div className="schedule-calendar-toolbar">
            <button type="button" className="btn btn-secondary" onClick={() => moveMonth(-1)}>
              이전달
            </button>
            <strong className="schedule-calendar-month-label">{formatMonthLabel(monthCursor)}</strong>
            <button type="button" className="btn btn-secondary" onClick={() => moveMonth(1)}>
              다음달
            </button>
          </div>

          <div className="schedule-calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          {loading ? (
            <div className="empty-state">일정을 불러오는 중입니다...</div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : (
            <div className="schedule-calendar-grid">
              {monthDays.map((day) => {
                const items = entriesByDate.get(day.key) ?? [];
                const isToday = day.key === toDateKey(new Date());
                const isSelected = day.key === selectedDate;

                return (
                  <button
                    key={day.key}
                    type="button"
                    className={[
                      'schedule-calendar-day',
                      day.inMonth ? '' : 'is-outside',
                      isToday ? 'is-today' : '',
                      isSelected ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedDate(day.key)}
                  >
                    <div className="schedule-calendar-day-head">
                      <span className="schedule-calendar-day-number">{day.date.getDate()}</span>
                    </div>
                    <div className="schedule-calendar-day-body schedule-calendar-day-body-centered">
                      {items.length > 0 ? (
                        <span className="schedule-calendar-day-pill">{items.length}건</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="schedule-calendar-detail">
          <div className="schedule-calendar-detail-head">
            <strong>{formatDetailDate(selectedDate)}</strong>
            <span>{selectedItems.length}건</span>
          </div>

          {loading ? (
            <div className="empty-state">일정 상세를 준비 중입니다...</div>
          ) : selectedItems.length === 0 ? (
            <div className="empty-state">선택한 날짜에 등록된 일정이 없습니다.</div>
          ) : (
            <div className="schedule-calendar-detail-list">
              {selectedItems.map((item) => (
                <div key={item.id} className="schedule-calendar-detail-item">
                  <div className="schedule-calendar-detail-top">
                    <strong>{item.client || '-'}</strong>
                    <span
                      className={`schedule-calendar-status-badge ${
                        item.shippedStatus === '출고' ? 'is-shipped' : 'is-unshipped'
                      }`}
                    >
                      {item.shippedStatus === '출고' ? '출고' : '미출고'}
                    </span>
                  </div>
                  <div className="schedule-calendar-detail-meta">
                    <span>발급번호: {item.issueNo || '-'}</span>
                    <span>수신처: {item.receiver || '-'}</span>
                    <span>품목명: {item.product || '-'}</span>
                  </div>
                  <div className="schedule-calendar-detail-stats">
                    <span>수량: {formatCount(item.qty)}</span>
                    <span>파레트: {formatNullableCount(item.pallet)}</span>
                    <span>박스: {formatNullableCount(item.box)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </Modal>
  );
}

function buildMonthDays(baseDate: Date): CalendarDay[] {
  const firstDay = startOfMonth(baseDate);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return {
      key: toDateKey(current),
      date: current,
      inMonth: current.getMonth() === baseDate.getMonth(),
    };
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatDetailDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} (${weekday})`;
}

function formatCount(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatNullableCount(value: number | null) {
  return value === null || value === undefined ? '-' : value.toLocaleString('ko-KR');
}
