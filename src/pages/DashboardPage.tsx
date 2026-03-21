import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard';
import PageHeader from '../components/PageHeader';
import Badge from '../components/ui/Badge';
import SlidePanel from '../components/ui/SlidePanel';
import type {
  DashboardArrivalTrend,
  DashboardIncomingDocument,
  DashboardRecentDocument,
  DashboardSummary,
} from '../types/dashboard';

type PanelType = 'today' | 'week' | 'incomplete' | 'trend' | null;

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

    if (panelType === 'incomplete') {
      return {
        title: '미완료건수',
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
    const incompleteRatio = (data.incompleteCount / total) * 100;
    const weekRatio = Math.max((data.weekIncomingCount / total) * 100, 0);
    const weekEnd = Math.min(completedRatio + incompleteRatio + weekRatio, 100);

    return {
      background: `conic-gradient(
        #3b82f6 0 ${completedRatio}%,
        #ef4444 ${completedRatio}% ${completedRatio + incompleteRatio}%,
        #f59e0b ${completedRatio + incompleteRatio}% ${weekEnd}%,
        #e5e7eb ${weekEnd}% 100%
      )`,
    };
  }, [data.completedCount, data.incompleteCount, data.trackedCount, data.weekIncomingCount]);

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

  function openTrendPanel(item: DashboardArrivalTrend) {
    setSelectedTrend(item);
    setPanelType('trend');
  }

  return (
    <div className="page-content dashboard-page">
      <PageHeader title="대시보드" description="" />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="dashboard-top-grid">
        <SummaryCard
          label={`오늘의 할일${data.todayLabel ? ` (${data.todayLabel})` : ''}`}
          value={loading ? '...' : data.todayIncomingCount.toLocaleString('ko-KR')}
          meta="입고일자가 오늘인 항목"
          onClick={() => setPanelType('today')}
        />
        <SummaryCard
          label={`금주의 할일${data.weekLabel ? ` (${data.weekLabel})` : ''}`}
          value={loading ? '...' : data.weekIncomingCount.toLocaleString('ko-KR')}
          meta="일요일부터 토요일까지의 예정 항목"
          onClick={() => setPanelType('week')}
        />
        <SummaryCard
          label="미완료건수"
          value={loading ? '...' : data.incompleteCount.toLocaleString('ko-KR')}
          meta="상태가 완료가 아닌 항목"
          danger
          onClick={() => setPanelType('incomplete')}
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
                수령완료 {loading ? '...' : `${data.completedCount}건`}
              </li>
              <li>
                <span className="dashboard-dot pending"></span>
                미완료 {loading ? '...' : `${data.incompleteCount}건`}
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
            <span>{data.weekLabel}</span>
          </div>

          <div className="dashboard-bar-chart">
            {(loading ? getEmptyTrendBars() : data.weeklyArrivals).map((item) => (
              <TrendBar
                key={item.date || item.label}
                item={item}
                max={getTrendMax(data.weeklyArrivals)}
                loading={loading}
                onClick={() => {
                  if (!loading) {
                    openTrendPanel(item);
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
        <div className="table-wrap">
          <table className="table dashboard-panel-table">
            <thead>
              <tr>
                <th style={{ width: 88, textAlign: 'center' }}>발급번호</th>
                <th style={{ width: 96, textAlign: 'center' }}>발주일자</th>
                <th style={{ width: 96, textAlign: 'center' }}>입고일자</th>
                <th style={{ textAlign: 'left' }}>납품처</th>
                <th style={{ textAlign: 'left' }}>수신처</th>
                <th style={{ width: 100, textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {!panelConfig || panelConfig.items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
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
                    onOpen={openDocumentInNewTab}
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
  onClick,
}: {
  item: DashboardArrivalTrend;
  max: number;
  loading: boolean;
  onClick: () => void;
}) {
  const height = max === 0 ? 16 : Math.max((item.count / max) * 100, item.count > 0 ? 16 : 10);

  return (
    <button
      type="button"
      className="dashboard-bar-item"
      title={item.date ? `${item.date}: ${item.count}건` : undefined}
      onClick={onClick}
    >
      <span className="dashboard-bar-label">{item.label}</span>
      <div className="dashboard-bar-track">
        <div className="dashboard-bar-fill" style={{ height: `${height}%` }} />
      </div>
      <strong className="dashboard-bar-value">{loading ? '...' : item.count}</strong>
    </button>
  );
}

function DashboardIncomingRow({
  document,
  onOpen,
}: {
  document: DashboardIncomingDocument;
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
      <td style={{ textAlign: 'center' }}>
        {document.receipt ? <Badge variant="muted-blue">{document.receipt}</Badge> : <span>-</span>}
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

function getTrendMax(items: DashboardArrivalTrend[]) {
  return Math.max(...items.map((item) => item.count), 0);
}

function getEmptyTrendBars(): DashboardArrivalTrend[] {
  return ['일', '월', '화', '수', '목', '금', '토'].map((label, index) => ({
    date: `loading-${index}`,
    label,
    count: 0,
    documents: [],
  }));
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
