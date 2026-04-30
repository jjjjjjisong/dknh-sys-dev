import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMceePressReleasePage, updateMceePressReleaseEffectiveDate } from '../api/mceePressReleases';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Alert from '../components/ui/Alert';
import type { MceePressRelease } from '../types/mceePressRelease';

const PAGE_SIZE = 20;

export default function MceePressReleasePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<MceePressRelease[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('from') ?? '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') ?? '');
  const [keyword, setKeyword] = useState(() => searchParams.get('keyword') ?? '');
  const [currentPage, setCurrentPage] = useState(() => getPageParam(searchParams));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectiveDateDrafts, setEffectiveDateDrafts] = useState<Record<string, string>>({});
  const [savingEffectiveDateId, setSavingEffectiveDateId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    void loadPage();
  }, [currentPage, dateFrom, dateTo, keyword]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (currentPage > 1) nextParams.set('page', String(currentPage));
    if (dateFrom) nextParams.set('from', dateFrom);
    if (dateTo) nextParams.set('to', dateTo);
    if (keyword) nextParams.set('keyword', keyword);
    setSearchParams(nextParams, { replace: true });
  }, [currentPage, dateFrom, dateTo, keyword, setSearchParams]);

  function updateDateFrom(value: string) {
    setDateFrom(value);
    setCurrentPage(1);
  }

  function updateDateTo(value: string) {
    setDateTo(value);
    setCurrentPage(1);
  }

  function updateKeyword(value: string) {
    setKeyword(value);
    setCurrentPage(1);
  }

  async function loadPage() {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    try {
      setLoading(true);
      setError(null);
      const result = await fetchMceePressReleasePage({
        page: currentPage,
        pageSize: PAGE_SIZE,
        dateFrom,
        dateTo,
        keyword,
      });
      if (requestId !== loadRequestIdRef.current) return;
      setItems(result.items);
      setTotalItems(result.totalCount);
      setEffectiveDateDrafts((current) => {
        const next = { ...current };
        result.items.forEach((item) => {
          next[item.id] = item.effectiveDate ?? '';
        });
        return next;
      });
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : '보도자료 목록을 불러오지 못했습니다.');
    } finally {
      if (requestId !== loadRequestIdRef.current) return;
      setLoading(false);
    }
  }

  async function handleSaveEffectiveDate(item: MceePressRelease) {
    const nextEffectiveDate = (effectiveDateDrafts[item.id] ?? '').trim();
    const normalizedEffectiveDate = nextEffectiveDate || null;
    if ((item.effectiveDate ?? '') === (normalizedEffectiveDate ?? '')) return;

    try {
      setSavingEffectiveDateId(item.id);
      setError(null);
      await updateMceePressReleaseEffectiveDate(item.id, normalizedEffectiveDate);
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, effectiveDate: normalizedEffectiveDate } : currentItem,
        ),
      );
      setEffectiveDateDrafts((current) => ({ ...current, [item.id]: normalizedEffectiveDate ?? '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '시행일 저장에 실패했습니다.');
      setEffectiveDateDrafts((current) => ({ ...current, [item.id]: item.effectiveDate ?? '' }));
    } finally {
      setSavingEffectiveDateId(null);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="보도자료" description="" />

      <div className="mcee-page-note">
        <div>*수신처: 기후에너지환경부 사이트 → 알림·홍보 → [공지·공고] / [보도·설명]</div>
        <div>*키워드: 1회용, 일회용, 다회용, 재활용, 빨대, 스틱, 플라스틱, PET, PP, PS, 컵보증금, 폐기물</div>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="mcee-filter-grid">
          <label className="field">
            <span>등록일자 시작</span>
            <input
              className="history-date-input"
              type="date"
              value={dateFrom}
              onChange={(event) => updateDateFrom(event.target.value)}
            />
          </label>

          <label className="field">
            <span>등록일자 종료</span>
            <input
              className="history-date-input"
              type="date"
              value={dateTo}
              onChange={(event) => updateDateTo(event.target.value)}
            />
          </label>

          <label className="field">
            <span>키워드 검색</span>
            <input
              value={keyword}
              onChange={(event) => updateKeyword(event.target.value)}
              placeholder="제목, 본문, 부서명, 키워드로 검색"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="table-wrap mcee-press-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 112, textAlign: 'center' }}>등록일자</th>
                <th style={{ width: 132, textAlign: 'center' }}>시행일</th>
                <th style={{ minWidth: 280 }}>제목</th>
                <th style={{ width: 120 }}>키워드</th>
                <th style={{ width: 150 }}>부서</th>
                <th style={{ width: 150, textAlign: 'center' }}>첨부파일</th>
                <th style={{ width: 92, textAlign: 'center' }} aria-label="원문 링크"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    보도자료 목록을 불러오는 중입니다...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>{item.publishedDate || '-'}</td>
                    <td>
                      <input
                        className="mcee-effective-date-input"
                        type="date"
                        value={effectiveDateDrafts[item.id] ?? ''}
                        disabled={savingEffectiveDateId === item.id}
                        onChange={(event) =>
                          setEffectiveDateDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        onBlur={() => void handleSaveEffectiveDate(item)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          event.currentTarget.blur();
                        }}
                      />
                    </td>
                    <td>
                      <Link className="mcee-title-link table-primary table-clamp-2" to={`/mcee-press-releases/${item.id}`}>
                        {item.title || '-'}
                      </Link>
                    </td>
                    <td title={getKeywordTitle(item)}>
                      <span className="mcee-keyword-summary">{getKeywordSummary(item)}</span>
                    </td>
                    <td>{item.department || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {item.downloadLinks.length > 0 ? (
                        <div className="mcee-link-stack">
                          {item.downloadLinks.map((downloadLink, index) => (
                            <a
                              key={`${item.id}-${downloadLink.url}`}
                              className="btn btn-secondary btn-sm mcee-table-link"
                              href={downloadLink.url}
                              target="_blank"
                              rel="noreferrer"
                              title={downloadLink.size ? `${downloadLink.name} (${downloadLink.size})` : downloadLink.name}
                            >
                              파일{index + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.sourceUrl ? (
                        <a
                          className="btn btn-secondary btn-sm mcee-table-link mcee-source-link"
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="원문 열기"
                        >
                          링크
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </section>
    </div>
  );
}

function getPageParam(searchParams: URLSearchParams) {
  const page = Number(searchParams.get('page') ?? '1');
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function getKeywordSummary(item: MceePressRelease) {
  const keywords = getDisplayKeywords(item);
  if (keywords.length === 0) return '-';
  if (keywords.length === 1) return keywords[0];
  return `${keywords[0]} 외 ${keywords.length - 1}건`;
}

function getKeywordTitle(item: MceePressRelease) {
  const keywords = getDisplayKeywords(item);
  return keywords.length > 0 ? keywords.join(', ') : '';
}

function getDisplayKeywords(item: MceePressRelease) {
  const keywords = item.matchedKeywords.length > 0 ? item.matchedKeywords : [item.searchKeyword];
  return Array.from(new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)));
}
