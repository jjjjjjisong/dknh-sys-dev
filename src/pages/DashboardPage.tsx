import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../api/dashboard';
import PageHeader from '../components/PageHeader';
import Badge from '../components/ui/Badge';
import SlidePanel from '../components/ui/SlidePanel';
import type {
  DashboardIncomingDocument,
  DashboardRecentDocument,
  DashboardSummary,
} from '../types/dashboard';

type PanelType = 'today' | 'week' | 'incomplete' | null;

const emptySummary: DashboardSummary = {
  todayIncomingCount: 0,
  weekIncomingCount: 0,
  incompleteCount: 0,
  todayIncomingDocuments: [],
  weekIncomingDocuments: [],
  incompleteDocuments: [],
  recentDocuments: [],
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelType, setPanelType] = useState<PanelType>(null);

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
        title: '금일 입고건수',
        description: '오늘 입고 예정인 발급번호 목록입니다. 항목을 클릭하면 새 탭으로 상세 화면이 열립니다.',
        items: data.todayIncomingDocuments,
      };
    }

    if (panelType === 'week') {
      return {
        title: '금주 입고 건수',
        description: '이번 주 도래 예정 입고건 중 미완료된 항목입니다. 항목을 클릭하면 새 탭으로 상세 화면이 열립니다.',
        items: data.weekIncomingDocuments,
      };
    }

    if (panelType === 'incomplete') {
      return {
        title: '미완료건수',
        description: '수령 완료 처리되지 않은 입고건 목록입니다. 항목을 클릭하면 새 탭으로 상세 화면이 열립니다.',
        items: data.incompleteDocuments,
      };
    }

    return null;
  }, [data.incompleteDocuments, data.todayIncomingDocuments, data.weekIncomingDocuments, panelType]);

  function openDocumentInNewTab(documentId: string) {
    const target = `${window.location.origin}${window.location.pathname}#/doc-history/${documentId}`;
    window.open(target, '_blank');
  }

  function openDocumentInCurrentTab(documentId: string) {
    navigate(`/doc-history/${documentId}`);
  }

  return (
    <div className="page-content">
      <PageHeader
        title="대시보드"
        description="오늘 확인해야 할 입고 현황과 최근 등록 문서를 한눈에 확인합니다."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="stats-grid dashboard-stats-grid">
        <button
          type="button"
          className="card stat-card dashboard-stat-button"
          onClick={() => setPanelType('today')}
        >
          <div className="stat-label">금일 입고건수</div>
          <div className="stat-value">{loading ? '...' : data.todayIncomingCount.toLocaleString('ko-KR')}</div>
          <div className="dashboard-stat-meta">클릭 시 발급번호 리스트 보기</div>
        </button>

        <button
          type="button"
          className="card stat-card dashboard-stat-button"
          onClick={() => setPanelType('week')}
        >
          <div className="stat-label">금주 입고 건수</div>
          <div className="stat-value">{loading ? '...' : data.weekIncomingCount.toLocaleString('ko-KR')}</div>
          <div className="dashboard-stat-meta">이번 주 미완료 입고건 확인</div>
        </button>

        <button
          type="button"
          className="card stat-card dashboard-stat-button"
          onClick={() => setPanelType('incomplete')}
        >
          <div className="stat-label">미완료건수</div>
          <div className="stat-value">{loading ? '...' : data.incompleteCount.toLocaleString('ko-KR')}</div>
          <div className="dashboard-stat-meta">전체 미완료 입고건 확인</div>
        </button>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>최근 등록된 문서</h2>
            <p>발행 이력과 같은 테이블 흐름으로 최근 문서를 확인하고 바로 상세로 이동할 수 있습니다.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">대시보드 문서 목록을 불러오는 중입니다...</div>
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
        description={panelConfig?.description}
        onClose={() => setPanelType(null)}
        footer={
          <button type="button" className="btn btn-secondary" onClick={() => setPanelType(null)}>
            닫기
          </button>
        }
      >
        {!panelConfig || panelConfig.items.length === 0 ? (
          <div className="empty-state">표시할 항목이 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table className="table dashboard-panel-table">
              <thead>
                <tr>
                  <th style={{ width: 96, textAlign: 'center' }}>발급번호</th>
                  <th style={{ width: 112, textAlign: 'center' }}>발주일자</th>
                  <th style={{ width: 112, textAlign: 'center' }}>입고일자</th>
                  <th style={{ textAlign: 'left' }}>납품처</th>
                  <th style={{ textAlign: 'left' }}>수신처</th>
                  <th style={{ width: 100, textAlign: 'center' }}>수령상태</th>
                </tr>
              </thead>
              <tbody>
                {panelConfig.items.map((document) => (
                  <DashboardIncomingRow
                    key={`${panelType}-${document.id}`}
                    document={document}
                    onOpen={openDocumentInNewTab}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SlidePanel>
    </div>
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

function formatDateTime(value: string) {
  if (!value) return '-';
  return value.slice(0, 16).replace('T', ' ');
}
