import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { fetchDashboardSummary } from '../api/dashboard';
import type { DashboardSummary } from '../types/dashboard';

const emptySummary: DashboardSummary = {
  activeClientCount: 0,
  productCount: 0,
  documentCount: 0,
  recentDocuments: [],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError(err instanceof Error ? err.message : '대시보드 조회에 실패했습니다.');
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

  return (
    <div className="page-content">
      <PageHeader
        title="대시보드"
        description="현재 데이터 기준의 간단한 요약 정보만 조회합니다."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="stats-grid">
        <article className="card stat-card">
          <div className="stat-label">저장 문서 수</div>
          <div className="stat-value">
            {loading ? '...' : data.documentCount.toLocaleString('ko-KR')}
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-label">사용 중인 납품처</div>
          <div className="stat-value">
            {loading ? '...' : data.activeClientCount.toLocaleString('ko-KR')}
          </div>
        </article>
        <article className="card stat-card">
          <div className="stat-label">등록 품목 수</div>
          <div className="stat-value">
            {loading ? '...' : data.productCount.toLocaleString('ko-KR')}
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>최근 문서</h2>
            <p>복잡한 계산 없이 최근 저장 문서만 간단히 보여줍니다.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">불러오는 중입니다...</div>
        ) : data.recentDocuments.length === 0 ? (
          <div className="empty-state">표시할 문서가 없습니다.</div>
        ) : (
          <div className="list-stack">
            {data.recentDocuments.map((document) => (
              <article className="list-item" key={document.id}>
                <div>
                  <div className="list-title">
                    {document.issueNo || '-'} / {document.client || '납품처 미지정'}
                  </div>
                  <div className="list-meta">
                    작성일 {document.orderDate || '-'} | 작성자 {document.author || '-'}
                  </div>
                </div>
                <div className={document.cancelled ? 'badge badge-cancel' : 'badge'}>
                  {document.cancelled ? '거래취소' : '정상'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
