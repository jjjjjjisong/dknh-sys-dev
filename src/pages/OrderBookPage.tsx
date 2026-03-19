import { useEffect, useMemo, useState } from 'react';
import { fetchOrderBook } from '../api/order-book';
import PageHeader from '../components/PageHeader';
import type { OrderBookEntry } from '../types/order-book';

const today = new Date();

function getDefaultDateRange() {
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

export default function OrderBookPage() {
  const defaults = getDefaultDateRange();
  const [entries, setEntries] = useState<OrderBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchOrderBook();
        if (!mounted) return;
        setEntries(rows);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '수주대장을 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return entries.filter((entry) => {
      const baseDate = entry.date || entry.createdAt?.slice(0, 10) || '';
      if (dateFrom && baseDate && baseDate < dateFrom) return false;
      if (dateTo && baseDate && baseDate > dateTo) return false;
      if (!search) return true;
      return [entry.client, entry.product, entry.issueNo, entry.note].join(' ').toLowerCase().includes(search);
    });
  }, [dateFrom, dateTo, entries, keyword]);

  function resetSearch() {
    const next = getDefaultDateRange();
    setDateFrom(next.from);
    setDateTo(next.to);
    setKeyword('');
  }

  return (
    <div className="page-content">
      <PageHeader title="수주대장" description="날짜별 거래 내역을 관리합니다" />
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card">
        <div className="history-filter-grid">
          <label className="field"><span>날짜 (시작)</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="field"><span>날짜 (종료)</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          <label className="field field-span-2"><span>거래처 / 품목 검색</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="거래처, 품목명 검색..." /></label>
        </div>
        <div className="button-row">
          <button className="btn btn-primary">검색</button>
          <button className="btn btn-secondary" onClick={resetSearch}>초기화</button>
          <button className="btn btn-disabled" disabled>직접 추가는 다음 단계</button>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>수주대장 목록</h2>
            <p>원본 HTML의 기본 목록 구조를 기준으로 1차 이식했습니다.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">수주대장을 불러오는 중입니다...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">수주 내역이 없습니다</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>No</th>
                  <th style={{ width: 120, textAlign: 'center' }}>날짜</th>
                  <th style={{ width: 120, textAlign: 'center' }}>납기일</th>
                  <th style={{ minWidth: 140 }}>거래처</th>
                  <th>품목명</th>
                  <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                  <th style={{ width: 100 }}>발급번호</th>
                  <th style={{ width: 100 }}>비고</th>
                  <th style={{ width: 90, textAlign: 'center' }}>명세서수령</th>
                  <th style={{ width: 70, textAlign: 'center' }}>상태</th>
                  <th style={{ width: 90, textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td style={{ textAlign: 'center', color: '#6b7280' }}>{index + 1}</td>
                    <td style={{ textAlign: 'center' }}>{entry.date || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{entry.deadline || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{entry.client}</td>
                    <td>{entry.product}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(entry.qty)}</td>
                    <td>{entry.issueNo || '-'}</td>
                    <td>{entry.note || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {entry.receipt ? <span className="badge badge-muted-blue">{entry.receipt}</span> : ''}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${entry.cancelled ? 'badge-cancel' : 'badge-muted-blue'}`}>
                        {entry.cancelled ? '취소' : '정상'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-disabled" disabled>{entry.fromDoc ? '문서연동' : '수정'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}
