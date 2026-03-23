import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary, fetchDashboardWeeklyArrivals } from '../api/dashboard';
import { updateManyOrderBookShippedStatus, updateOrderBookShippedStatus } from '../api/order-book';
import PageHeader from '../components/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import SlidePanel from '../components/ui/SlidePanel';
import type {
  DashboardArrivalTrend,
  DashboardIncomingDocument,
  DashboardRecentDocument,
  DashboardSummary,
} from '../types/dashboard';
import type { OrderBookShippingStatus } from '../types/order-book';

type PanelType = 'today' | 'week' | 'unshipped' | 'trend' | null;

const emptySummary: DashboardSummary = {
  todayIncomingCount: 0,
  weekIncomingCount: 0,
  incompleteCount: 0,
  completedCount: 0,
  trackedCount: 0,
  weekLabel: '',
  todayLabel: '',
  todayIncomingDocuments: [],
  weekIncomingDocuments: [],
  incompleteDocuments: [],
  recentDocuments: [],
  weeklyArrivals: [],
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelType, setPanelType] = useState<PanelType>(null);
  const [selectedTrend, setSelectedTrend] = useState<DashboardArrivalTrend | null>(null);
  const [selectedOrderBookIds, setSelectedOrderBookIds] = useState<string[]>([]);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [trendWeekLabel, setTrendWeekLabel] = useState('');
  const [trendWeeklyArrivals, setTrendWeeklyArrivals] = useState<DashboardArrivalTrend[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchDashboardSummary();
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '대시보드 정보를 불러오지 못했습니다.');
        }
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
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTrend() {
      try {
        if (trendWeeklyArrivals.length === 0) {
          setTrendLoading(true);
        }
        const result = await fetchDashboardWeeklyArrivals(getShiftedWeekDate(weekOffset));
        if (mounted) {
          setTrendWeekLabel(result.weekLabel);
          setTrendWeeklyArrivals(result.weeklyArrivals);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : '주간 입고 예정 데이터를 불러오지 못했습니다.');
        }
      } finally {
        if (mounted) {
          setTrendLoading(false);
        }
      }
    }

    void loadTrend();
    return () => {
      mounted = false;
    };
  }, [weekOffset]);

  useEffect(() => {
    setSelectedOrderBookIds([]);
  }, [panelType, selectedTrend]);

  const panelConfig = useMemo(() => {
    if (panelType === 'today') {
      return {
        title: `오늘의 할일${data.todayLabel ? ` (${data.todayLabel})` : ''}`,
        items: data.todayIncomingDocuments,
      };
    }

    if (panelType === 'week') {
      return {
        title: `금주의 할일${data.weekLabel ? ` (${data.weekLabel})` : ''}`,
        items: data.weekIncomingDocuments,
      };
    }

    if (panelType === 'unshipped') {
      return {
        title: '미출고 건수',
        items: data.incompleteDocuments,
      };
    }

    if (panelType === 'trend' && selectedTrend) {
      return {
        title: `${formatTrendTitleDate(selectedTrend.date)} 입고 예정 건수`,
        items: selectedTrend.documents,
      };
    }

    return null;
  }, [
    data.incompleteDocuments,
    data.todayIncomingDocuments,
    data.todayLabel,
    data.weekIncomingDocuments,
    data.weekLabel,
    panelType,
    selectedTrend,
  ]);

  const donutStyle = useMemo(() => {
    const total = Math.max(data.trackedCount, 1);
    const completedRatio = (data.completedCount / total) * 100;
    const unshippedRatio = (data.incompleteCount / total) * 100;
    const weekRatio = Math.max((data.weekIncomingCount / total) * 100, 0);
    const weekEnd = Math.min(completedRatio + unshippedRatio + weekRatio, 100);

    return {
      background: `conic-gradient(
        #3b82f6 0 ${completedRatio}%,
        #ef4444 ${completedRatio}% ${completedRatio + unshippedRatio}%,
        #f59e0b ${completedRatio + unshippedRatio}% ${weekEnd}%,
        #e5e7eb ${weekEnd}% 100%
      )`,
    };
  }, [data.completedCount, data.incompleteCount, data.trackedCount, data.weekIncomingCount]);

  const canBatchShip =
    panelType === 'unshipped' &&
    selectedOrderBookIds.length > 0 &&
    panelConfig?.items.some((item) => selectedOrderBookIds.includes(item.orderBookId ?? ''));

  const allChecked =
    panelType === 'unshipped' &&
    panelConfig &&
    panelConfig.items.length > 0 &&
    panelConfig.items.every((item) => item.orderBookId && selectedOrderBookIds.includes(item.orderBookId));

  function closePanel() {
    setPanelType(null);
    setSelectedTrend(null);
  }

  function openDocumentInNewTab(documentId: string) {
    const target = `${window.location.origin}${window.location.pathname}#/doc-history/${documentId}`;
    window.open(target, '_blank');
  }

  function openDocumentInCurrentTab(documentId: string) {
    navigate(`/doc-history/${documentId}`);
  }

  function toggleSelectAll(checked: boolean) {
    if (!panelConfig || panelType !== 'unshipped') return;
    const ids = panelConfig.items
      .map((item) => item.orderBookId)
      .filter((value): value is string => Boolean(value));
    setSelectedOrderBookIds(checked ? ids : []);
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedOrderBookIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function handleShippedStatusChange(
    document: DashboardIncomingDocument,
    shippedStatus: OrderBookShippingStatus,
  ) {
    if (!document.orderBookId) return;

    try {
      await updateOrderBookShippedStatus(document.orderBookId, shippedStatus);
      setData((current) => applyShippedStatusToSummary(current, [document.orderBookId!], shippedStatus));
      window.alert(
        shippedStatus === '출고'
          ? '출고상태로 변경되었습니다.'
          : '미출고상태로 변경되었습니다.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '출고상태 변경에 실패했습니다.');
    }
  }

  async function handleBatchShip() {
    if (!canBatchShip) return;

    try {
      setBatchUpdating(true);
      await updateManyOrderBookShippedStatus(selectedOrderBookIds, '출고');
      setData((current) => applyShippedStatusToSummary(current, selectedOrderBookIds, '출고'));
      setSelectedOrderBookIds([]);
      window.alert('선택한 품목들이 출고상태로 변경되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 출고처리에 실패했습니다.');
    } finally {
      setBatchUpdating(false);
    }
  }

  return (
    <div className="page-content dashboard-page">
      <PageHeader title="대시보드" description="" />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="dashboard-top-grid">
        <SummaryCard
          label={`오늘의 할일${data.todayLabel ? ` (${data.todayLabel})` : ''}`}
          value={loading ? '...' : data.todayIncomingCount.toLocaleString('ko-KR')}
          meta="입고일자가 오늘인 품목"
          onClick={() => setPanelType('today')}
        />
        <SummaryCard
          label={`금주의 할일${data.weekLabel ? ` (${data.weekLabel})` : ''}`}
          value={loading ? '...' : data.weekIncomingCount.toLocaleString('ko-KR')}
          meta="일요일부터 토요일까지 입고 예정 품목"
          onClick={() => setPanelType('week')}
        />
        <SummaryCard
          label="미출고 건수"
          value={loading ? '...' : data.incompleteCount.toLocaleString('ko-KR')}
          meta="거래취소가 아니고 미출고 처리된 품목"
          danger
          onClick={() => setPanelType('unshipped')}
        />
      </section>

      <section className="dashboard-middle-grid">
        <article className="dashboard-chart-card">
          <div className="dashboard-card-head">
            <h2>진행 현황</h2>
          </div>

          <div className="dashboard-donut-wrap">
            <div className="dashboard-donut-chart" style={donutStyle}>
              <div className="dashboard-donut-center">
                <strong>{loading ? '...' : data.trackedCount.toLocaleString('ko-KR')}</strong>
                <span>전체</span>
              </div>
            </div>

            <ul className="dashboard-legend">
              <li>
                <span className="dashboard-dot done"></span>
                출고 {loading ? '...' : `${data.completedCount}건`}
              </li>
              <li>
                <span className="dashboard-dot pending"></span>
                미출고 {loading ? '...' : `${data.incompleteCount}건`}
              </li>
              <li>
                <span className="dashboard-dot week"></span>
                금주예정 {loading ? '...' : `${data.weekIncomingCount}건`}
              </li>
            </ul>
          </div>
        </article>

        <article className="dashboard-chart-card">
          <div className="dashboard-card-head">
            <h2>최근 7일 입고 예정 건수</h2>
            <div className="dashboard-week-nav">
              <button
                type="button"
                className="dashboard-week-nav-button"
                onClick={() => setWeekOffset((current) => current - 1)}
                aria-label="이전 주"
              >
                ‹
              </button>
              <span style={{ fontSize: '1rem', fontWeight: 600, padding: '0 8px' }}>{trendWeekLabel}</span>
              <button
                type="button"
                className="dashboard-week-nav-button"
                onClick={() => setWeekOffset((current) => current + 1)}
                aria-label="다음 주"
              >
                ›
              </button>
            </div>
          </div>

          <div className="dashboard-bar-chart">
            {(trendLoading ? getEmptyTrendBars() : trendWeeklyArrivals).map((item, index) => (
              <TrendBar
                key={index}
                item={item}
                max={getTrendMax(trendWeeklyArrivals)}
                loading={trendLoading}
                index={index}
                onClick={() => {
                  if (!trendLoading) {
                    setSelectedTrend(item);
                    setPanelType('trend');
                  }
                }}
              />
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>최근 등록된 문서</h2>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">최근 등록된 문서를 불러오는 중입니다...</div>
        ) : data.recentDocuments.length === 0 ? (
          <div className="empty-state">최근 등록된 문서가 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table className="table dashboard-recent-table">
              <thead>
                <tr>
                  <th style={{ width: 100, textAlign: 'center' }}>발급번호</th>
                  <th style={{ width: 120, textAlign: 'center' }}>발주일자</th>
                  <th style={{ width: 120, textAlign: 'center' }}>입고일자</th>
                  <th style={{ textAlign: 'left' }}>납품처</th>
                  <th style={{ textAlign: 'left' }}>수신처</th>
                  <th style={{ width: 90, textAlign: 'center' }}>작성자</th>
                  <th style={{ width: 160, textAlign: 'center' }}>최근 수정일시</th>
                  <th style={{ width: 100, textAlign: 'center' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.recentDocuments.map((document) => (
                  <DashboardRecentDocumentRow
                    key={document.id}
                    document={document}
                    onOpen={openDocumentInCurrentTab}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SlidePanel
        open={Boolean(panelConfig)}
        title={panelConfig?.title ?? ''}
        onClose={closePanel}
        footer={
          <button type="button" className="btn btn-secondary" onClick={closePanel}>
            닫기
          </button>
        }
      >
        {panelType === 'unshipped' ? (
          <div className="history-toolbar">
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleBatchShip()}
              disabled={!canBatchShip || batchUpdating}
            >
              {batchUpdating ? '처리 중...' : '일괄 출고처리'}
            </Button>
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="table dashboard-panel-table">
            <thead>
              <tr>
                {panelType === 'unshipped' ? (
                  <th style={{ width: 42, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(allChecked)}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                  </th>
                ) : null}
                <th style={{ width: 88, textAlign: 'center' }}>발급번호</th>
                <th style={{ width: 96, textAlign: 'center' }}>입고일자</th>
                <th style={{ textAlign: 'left' }}>납품처</th>
                <th style={{ textAlign: 'left' }}>수신처</th>
                <th style={{ textAlign: 'left' }}>품목명</th>
                <th style={{ width: 88, textAlign: 'center' }}>수량</th>
                <th style={{ width: 88, textAlign: 'center' }}>파렛트</th>
                <th style={{ width: 88, textAlign: 'center' }}>박스</th>
                <th style={{ width: 110, textAlign: 'center' }}>
                  {panelType === 'unshipped' ? '출고상태' : '상태'}
                </th>
              </tr>
            </thead>
            <tbody>
              {!panelConfig || panelConfig.items.length === 0 ? (
                <tr>
                  <td colSpan={panelType === 'unshipped' ? 10 : 9}>
                    <div className="dashboard-empty-state dashboard-panel-empty-state">
                      <div>해당 기간에 예정된 할 일이 없습니다.</div>
                      <div>새로운 입고 일정이 등록되면 이곳에 표시됩니다.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                panelConfig.items.map((document) => (
                  <DashboardIncomingRow
                    key={`${panelType}-${document.id}`}
                    document={document}
                    showSelection={panelType === 'unshipped'}
                    checked={
                      document.orderBookId ? selectedOrderBookIds.includes(document.orderBookId) : false
                    }
                    showShippedStatus={panelType === 'unshipped'}
                    onToggleSelect={(checked) => {
                      if (document.orderBookId) {
                        toggleSelectOne(document.orderBookId, checked);
                      }
                    }}
                    onOpen={openDocumentInNewTab}
                    onChangeShippedStatus={(shippedStatus) =>
                      void handleShippedStatusChange(document, shippedStatus)
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </SlidePanel>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  meta,
  danger = false,
  onClick,
}: {
  label: string;
  value: string;
  meta: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="dashboard-summary-card-button" onClick={onClick}>
      <span className="dashboard-summary-label">{label}</span>
      <strong className={`dashboard-summary-number ${danger ? 'danger' : ''}`}>{value}</strong>
      <span className="dashboard-summary-meta">{meta}</span>
    </button>
  );
}

function TrendBar({
  item,
  max,
  loading,
  index,
  onClick,
}: {
  item: DashboardArrivalTrend;
  max: number;
  loading: boolean;
  index: number;
  onClick: () => void;
}) {
  const height = max === 0 ? 16 : Math.max((item.count / max) * 100, item.count > 0 ? 16 : 10);

  return (
    <button
      type="button"
      className="dashboard-bar-item"
      title={item.date ? `${item.date}: ${item.count}건` : undefined}
      onClick={onClick}
      style={{ transitionDelay: `${index * 35}ms` }}
    >
      <span className="dashboard-bar-label">{item.label}</span>
      <div className="dashboard-bar-track">
        <div
          className="dashboard-bar-fill"
          style={{
            height: `${height}%`,
            transitionDelay: `${index * 35}ms`,
          }}
        />
      </div>
      <strong className="dashboard-bar-value">{loading ? '...' : item.count}</strong>
    </button>
  );
}

function DashboardIncomingRow({
  document,
  checked,
  showSelection,
  showShippedStatus,
  onToggleSelect,
  onOpen,
  onChangeShippedStatus,
}: {
  document: DashboardIncomingDocument;
  checked?: boolean;
  showSelection?: boolean;
  showShippedStatus?: boolean;
  onToggleSelect?: (checked: boolean) => void;
  onOpen: (documentId: string) => void;
  onChangeShippedStatus?: (shippedStatus: OrderBookShippingStatus) => void;
}) {
  return (
    <tr className="dashboard-clickable-row" onClick={() => onOpen(document.documentId)}>
      {showSelection ? (
        <td style={{ textAlign: 'center' }} onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onToggleSelect?.(event.target.checked)}
          />
        </td>
      ) : null}
      <td style={{ textAlign: 'center' }}>{document.issueNo || '-'}</td>
      <td style={{ textAlign: 'center' }}>{document.arriveDate || '-'}</td>
      <td className="table-primary dashboard-ellipsis-cell" title={document.client || '-'}>
        {document.client || '-'}
      </td>
      <td className="dashboard-ellipsis-cell" title={document.receiver || '-'}>
        {document.receiver || '-'}
      </td>
      <td className="dashboard-ellipsis-cell" title={document.productName || '-'}>
        {document.productName || '-'}
      </td>
      <td style={{ textAlign: 'center' }}>{formatInteger(document.qty)}</td>
      <td style={{ textAlign: 'center' }}>{formatMaybeNumber(document.pallet)}</td>
      <td style={{ textAlign: 'center' }}>{formatMaybeNumber(document.box)}</td>
      <td
        style={{ textAlign: 'center' }}
        onClick={(event) => showShippedStatus && event.stopPropagation()}
      >
        {showShippedStatus ? (
          <select
            className="history-filter-select"
            value={document.shippedStatus}
            onChange={(event) =>
              onChangeShippedStatus?.(event.target.value as OrderBookShippingStatus)
            }
          >
            <option value="미출고">미출고</option>
            <option value="출고">출고</option>
          </select>
        ) : document.status === 'ST01' ? (
          <Badge variant="cancel">거래취소</Badge>
        ) : (
          <span>-</span>
        )}
      </td>
    </tr>
  );
}

function DashboardRecentDocumentRow({
  document,
  onOpen,
}: {
  document: DashboardRecentDocument;
  onOpen: (documentId: string) => void;
}) {
  return (
    <tr className="dashboard-clickable-row" onClick={() => onOpen(document.id)}>
      <td style={{ textAlign: 'center' }}>{document.issueNo || '-'}</td>
      <td style={{ textAlign: 'center' }}>{document.orderDate || '-'}</td>
      <td style={{ textAlign: 'center' }}>{document.arriveDate || '-'}</td>
      <td className="table-primary dashboard-ellipsis-cell" title={document.client || '-'}>
        {document.client || '-'}
      </td>
      <td className="dashboard-ellipsis-cell" title={document.receiver || '-'}>
        {document.receiver || '-'}
      </td>
      <td style={{ textAlign: 'center' }}>{document.author || '-'}</td>
      <td style={{ textAlign: 'center' }}>{formatDateTime(document.updatedAt || document.createdAt)}</td>
      <td style={{ textAlign: 'center' }}>
        {document.receipt ? <Badge variant="muted-blue">{document.receipt}</Badge> : <Badge>정상</Badge>}
      </td>
    </tr>
  );
}

function applyShippedStatusToSummary(
  summary: DashboardSummary,
  orderBookIds: string[],
  shippedStatus: OrderBookShippingStatus,
): DashboardSummary {
  const updateItems = (items: DashboardIncomingDocument[]) =>
    items.map((item) =>
      item.orderBookId && orderBookIds.includes(item.orderBookId)
        ? { ...item, shippedStatus }
        : item,
    );

  const todayIncomingDocuments = updateItems(summary.todayIncomingDocuments);
  const weekIncomingDocuments = updateItems(summary.weekIncomingDocuments);
  const weeklyArrivals = summary.weeklyArrivals.map((trend) => ({
    ...trend,
    documents: updateItems(trend.documents),
  }));
  const incompleteDocuments = updateItems(summary.incompleteDocuments).filter(
    (item) => item.status !== 'ST01' && item.shippedStatus === '미출고',
  );
  const trackedItems = updateItems([...summary.todayIncomingDocuments, ...summary.weekIncomingDocuments]);

  const uniqueTrackedIds = new Map<string, DashboardIncomingDocument>();
  for (const item of trackedItems) {
    uniqueTrackedIds.set(item.id, item);
  }

  const trackedCount = uniqueTrackedIds.size;
  const completedCount = Array.from(uniqueTrackedIds.values()).filter(
    (item) => item.shippedStatus === '출고',
  ).length;

  return {
    ...summary,
    todayIncomingDocuments,
    weekIncomingDocuments,
    weeklyArrivals,
    incompleteDocuments,
    incompleteCount: incompleteDocuments.length,
    completedCount,
    trackedCount,
  };
}

function getTrendMax(items: DashboardArrivalTrend[]) {
  return Math.max(...items.map((item) => item.count), 0);
}

function getEmptyTrendBars(): DashboardArrivalTrend[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: `loading-${index}`,
    label: '--(-)',
    count: 0,
    documents: [],
  }));
}

function getShiftedWeekDate(offset: number) {
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);
  return base;
}

function formatTrendTitleDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}(${weekday})`;
}

function formatDateTime(value: string) {
  if (!value) return '-';
  return value.slice(0, 16).replace('T', ' ');
}

function formatMaybeNumber(value: number | null) {
  return value === null || value === undefined ? '-' : value.toLocaleString('ko-KR');
}

function formatInteger(value: number) {
  return value.toLocaleString('ko-KR');
}
