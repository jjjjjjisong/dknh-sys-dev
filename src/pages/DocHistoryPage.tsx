import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDocuments, toggleDocumentCancelled, updateDocument } from '../api/documents';
import PageHeader from '../components/PageHeader';
import type { DocumentHistory, DocumentHistoryItem } from '../types/document';

type PreviewType = 'release' | 'invoice' | null;

const today = new Date().toISOString().slice(0, 10);

export default function DocHistoryPage() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [draft, setDraft] = useState<DocumentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'author'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>(null);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchDocuments();
      setDocuments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : '발행 이력을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!documentId) {
      setSelectedId(null);
      setDraft(null);
      return;
    }

    const selected = documents.find((row) => row.id === documentId) ?? null;
    setSelectedId(documentId);
    setDraft(selected ? cloneDocument(selected) : null);
  }, [documentId, documents]);

  const filteredDocuments = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return documents.filter((doc) => {
      const docDate = doc.orderDate || doc.createdAt?.slice(0, 10) || '';
      if (dateFrom && docDate && docDate < dateFrom) return false;
      if (dateTo && docDate && docDate > dateTo) return false;
      if (!search) return true;
      if (filterType === 'client') return doc.client.toLowerCase().includes(search);
      if (filterType === 'author') return doc.author.toLowerCase().includes(search);

      return [doc.issueNo, doc.client, doc.author, doc.items.map((item) => item.name1).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [dateFrom, dateTo, documents, filterType, keyword]);

  const previewHtml = useMemo(() => {
    if (!draft || !previewType) return '';
    return previewType === 'release'
      ? buildReleasePreviewHtml(draft)
      : buildInvoicePreviewHtml(draft);
  }, [draft, previewType]);

  const previewStyles =
    previewType === 'release' ? getReleasePreviewStyles(false) : getInvoicePreviewStyles(false);

  function openDocument(document: DocumentHistory) {
    navigate(`/doc-history/${document.id}`);
  }

  function closeEditor() {
    setPreviewType(null);
    navigate('/doc-history');
  }

  function updateDraft<K extends keyof DocumentHistory>(key: K, value: DocumentHistory[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateDraftItem(index: number, updater: (item: DocumentHistoryItem) => DocumentHistoryItem) {
    setDraft((current) => {
      if (!current) return current;
      const items = current.items.map((item, idx) => (idx === index ? updater(item) : item));
      const totals = getDocumentTotals(items);
      return {
        ...current,
        items,
        totalSupply: totals.totalSupply,
        totalVat: totals.totalVat,
        totalAmount: totals.totalAmount,
      };
    });
  }

  async function handleSave() {
    if (!draft) return;

    try {
      setSaving(true);
      setError(null);
      await updateDocument(draft);
      await reload();
      window.alert('수정 저장이 완료되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCancel() {
    if (!draft) return;
    const nextCancelled = !draft.cancelled;

    try {
      setSaving(true);
      setError(null);
      await toggleDocumentCancelled(draft.id, nextCancelled);
      await reload();
      window.alert(nextCancelled ? '거래취소 처리되었습니다.' : '거래취소가 해제되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function printCurrentPreview() {
    if (!draft || !previewType) return;
    const title = previewType === 'release' ? '출고의뢰서 미리보기' : '거래명세서 미리보기';
    const styles = previewType === 'release' ? getReleasePreviewStyles(true) : getInvoicePreviewStyles(true);
    const win = window.open('', '_blank', 'width=1280,height=900');

    if (!win) {
      window.alert('팝업이 차단되어 인쇄 창을 열지 못했습니다.');
      return;
    }

    win.document.write(`<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><title>${title}</title><style>${styles}</style></head><body>${previewHtml}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="page-content">
      <PageHeader
        title="발행 이력"
        description="저장된 출고 문서 목록입니다."
        action={
          !draft ? (
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => void reload()}>
                새로고침
              </button>
            </div>
          ) : undefined
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {!draft ? (
        <>
          <section className="card">
            <div className="history-filter-grid">
              <label className="field">
                <span>작성일(시작)</span>
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label className="field">
                <span>작성일(종료)</span>
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
              <label className="field">
                <span>검색 필터</span>
                <select value={filterType} onChange={(event) => setFilterType(event.target.value as 'all' | 'client' | 'author')}>
                  <option value="all">전체</option>
                  <option value="client">납품업체</option>
                  <option value="author">작성자</option>
                </select>
              </label>
              <label className="field">
                <span>키워드</span>
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="검색어 입력..." />
              </label>
            </div>
          </section>

          <section className="card">
            {loading ? (
              <div className="empty-state">발행 이력을 불러오는 중입니다...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="empty-state">검색 결과가 없습니다.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 90, textAlign: 'center' }}>발급번호</th>
                      <th style={{ width: 120, textAlign: 'center' }}>발주일자</th>
                      <th style={{ minWidth: 180 }}>납품처</th>
                      <th>품목정보</th>
                      <th style={{ width: 90, textAlign: 'center' }}>작성자</th>
                      <th style={{ width: 180, textAlign: 'center' }}>수정/저장일시</th>
                      <th style={{ width: 88, textAlign: 'center' }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} onClick={() => openDocument(doc)}>
                        <td style={{ textAlign: 'center' }}>{doc.issueNo}</td>
                        <td style={{ textAlign: 'center' }}>{doc.orderDate || '-'}</td>
                        <td style={{ fontWeight: 700 }}>
                          {doc.client}
                          {doc.cancelled ? <span className="badge badge-cancel history-badge">거래취소</span> : null}
                        </td>
                        <td>{doc.items.map((item) => item.name1).join(', ')}</td>
                        <td style={{ textAlign: 'center' }}>{doc.author || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{formatDateTime(doc.updatedAt || doc.createdAt)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${doc.cancelled ? 'badge-cancel' : 'badge-muted-blue'}`}>
                            {doc.cancelled ? '취소' : '완료'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <div className="history-editor-header">
            <button className="btn btn-secondary" onClick={closeEditor}>
              목록으로
            </button>
            <div className="history-editor-title">
              <h2>
                발행 이력 상세
                {draft.cancelled ? ' [거래취소]' : ''}
              </h2>
              <p>
                {draft.issueNo} · {draft.client}
              </p>
            </div>
          </div>

          <div className="detail-stack">
            <div className="history-edit-grid">
              <label className="field"><span>발급번호</span><input value={draft.issueNo} onChange={(event) => updateDraft('issueNo', event.target.value)} /></label>
              <label className="field"><span>납품처</span><input value={draft.client} onChange={(event) => updateDraft('client', event.target.value)} /></label>
              <label className="field"><span>담당자</span><input value={draft.manager} onChange={(event) => updateDraft('manager', event.target.value)} /></label>
              <label className="field"><span>담당자 연락처</span><input value={draft.managerTel} onChange={(event) => updateDraft('managerTel', event.target.value)} /></label>
              <label className="field"><span>수신</span><input value={draft.receiver} onChange={(event) => updateDraft('receiver', event.target.value)} /></label>
              <label className="field"><span>발주일자</span><input type="date" value={draft.orderDate || ''} onChange={(event) => updateDraft('orderDate', emptyToNull(event.target.value))} /></label>
              <label className="field"><span>입고일자</span><input type="date" value={draft.arriveDate || ''} onChange={(event) => updateDraft('arriveDate', emptyToNull(event.target.value))} /></label>
              <label className="field field-span-2"><span>납품 주소</span><input value={draft.deliveryAddr} onChange={(event) => updateDraft('deliveryAddr', event.target.value)} /></label>
              <label className="field field-span-2"><span>비고</span><input value={draft.remark} onChange={(event) => updateDraft('remark', event.target.value)} /></label>
              <label className="field field-span-2"><span>요청사항</span><textarea rows={2} value={draft.requestNote} onChange={(event) => updateDraft('requestNote', event.target.value)} /></label>
            </div>

            <div className="table-wrap">
              <table className="table doc-items-table wide">
                <thead>
                  <tr>
                    <th style={{ width: 32, textAlign: 'center' }}>#</th>
                    <th>품목명</th>
                    <th style={{ width: 60, textAlign: 'center' }}>구분</th>
                    <th style={{ width: 110 }}>발주일자</th>
                    <th style={{ width: 110 }}>입고일자</th>
                    <th style={{ width: 90 }}>수량(ea)</th>
                    <th style={{ width: 70 }}>파렛트</th>
                    <th style={{ width: 70 }}>BOX</th>
                    <th style={{ width: 110 }}>단가</th>
                    <th style={{ width: 110 }}>공급가액</th>
                    <th style={{ width: 70, textAlign: 'center' }}>VAT</th>
                    <th style={{ width: 140 }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((item, index) => (
                    <tr key={item.id || `${draft.id}-${index}`}>
                      <td style={{ textAlign: 'center' }}>{index + 1}</td>
                      <td><input value={item.name1} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, name1: event.target.value }))} /></td>
                      <td style={{ textAlign: 'center' }}>{item.gubun || '-'}</td>
                      <td><input type="date" value={item.orderDate || draft.orderDate || ''} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, orderDate: emptyToNull(event.target.value) }))} /></td>
                      <td><input type="date" value={item.arriveDate || draft.arriveDate || ''} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, arriveDate: emptyToNull(event.target.value) }))} /></td>
                      <td><input type="number" value={item.qty} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, qty: Math.max(parseInt(event.target.value || '0', 10) || 0, 0) }))} /></td>
                      <td><input type="number" value={item.customPallet ?? calculatePallet(item)} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, customPallet: parseNullableInteger(event.target.value) }))} /></td>
                      <td><input type="number" value={item.customBox ?? calculateBox(item)} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, customBox: parseNullableInteger(event.target.value) }))} /></td>
                      <td><input type="number" value={item.unitPrice} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, unitPrice: parseInt(event.target.value || '0', 10) || 0 }))} /></td>
                      <td><input type="number" value={item.supply} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, supply: parseInt(event.target.value || '0', 10) || 0 }))} /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={item.vat} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, vat: event.target.checked }))} /></td>
                      <td><textarea rows={2} value={item.itemNote} onChange={(event) => updateDraftItem(index, (current) => ({ ...current, itemNote: event.target.value }))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="doc-totals-strip">
              <div className="doc-total-item"><span>공급가액</span><strong>{formatNumber(draft.totalSupply)}</strong></div>
              <div className="doc-total-item"><span>부가세</span><strong>{formatNumber(draft.totalVat)}</strong></div>
              <div className="doc-total-item total"><span>합계금액</span><strong>{formatNumber(draft.totalAmount)}</strong></div>
            </div>

            <div className="doc-action-stack inline">
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? '저장 중..' : '수정 저장'}</button>
              <button className={draft.cancelled ? 'btn btn-secondary' : 'btn btn-danger'} disabled={saving} onClick={handleToggleCancel}>
                {draft.cancelled ? '취소 해제' : '거래취소'}
              </button>
              <button className="btn btn-secondary" onClick={() => setPreviewType('release')}>출고의뢰서</button>
              <button className="btn btn-primary" onClick={() => setPreviewType('invoice')}>거래명세서</button>
            </div>
          </div>
        </section>
      )}

      {previewType && draft ? (
        <div className="modal-overlay" onClick={(event) => {
          if (event.target === event.currentTarget) setPreviewType(null);
        }}>
          <div className="modal-card preview-modal-card">
            <div className="modal-head">
              <div>
                <h2>{previewType === 'release' ? '출고의뢰서 미리보기' : '거래명세서 미리보기'}</h2>
                <p>발행 이력에서 저장한 문서를 다시 불러온 미리보기입니다.</p>
              </div>
              <div className="button-row">
                <button className="btn btn-secondary" onClick={() => setPreviewType(null)}>닫기</button>
                <button className="btn btn-primary" onClick={printCurrentPreview}>인쇄 / PDF 저장</button>
              </div>
            </div>
            <div className={`release-preview-wrap in-modal ${previewType === 'invoice' ? 'invoice-preview-wrap' : ''}`}>
              <style>{previewStyles}</style>
              <div className={`release-preview-host ${previewType === 'invoice' ? 'invoice-preview-host' : ''}`} dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function cloneDocument(document: DocumentHistory): DocumentHistory {
  return { ...document, items: document.items.map((item) => ({ ...item })) };
}

function calculatePallet(item: DocumentHistoryItem) {
  const eaPerP = item.eaPerB && item.boxPerP ? item.eaPerB * item.boxPerP : null;
  return eaPerP ? Math.ceil(item.qty / eaPerP) : '';
}

function calculateBox(item: DocumentHistoryItem) {
  return item.eaPerB ? Math.ceil(item.qty / item.eaPerB) : '';
}

function getDocumentTotals(items: DocumentHistoryItem[]) {
  return items.reduce(
    (acc, item) => {
      const supply = item.supply || Math.round((item.unitPrice || 0) * item.qty);
      const vat = item.vat ? Math.round(supply * 0.1) : 0;
      return {
        totalSupply: acc.totalSupply + supply,
        totalVat: acc.totalVat + vat,
        totalAmount: acc.totalAmount + supply + vat,
      };
    },
    { totalSupply: 0, totalVat: 0, totalAmount: 0 },
  );
}

function buildReleasePreviewHtml(data: DocumentHistory) {
  const rows = data.items.map((item, index) => {
    const eaPerP = item.eaPerB && item.boxPerP ? item.eaPerB * item.boxPerP : null;
    const pallet = item.customPallet ?? (eaPerP ? Math.ceil(item.qty / eaPerP) : '-');
    const box = item.customBox ?? (item.eaPerB ? Math.ceil(item.qty / item.eaPerB) : '-');
    return `<tr><td class="c">${index + 1}</td><td class="c">${escapeHtml(formatMonthDay(item.orderDate || data.orderDate || ''))}</td><td class="c">${escapeHtml(formatMonthDay(item.arriveDate || data.arriveDate || data.orderDate || ''))}</td><td class="l">${escapeHtml(data.client)}</td><td class="l">${escapeHtml(item.name1)}</td><td class="c">${escapeHtml(String(pallet))}</td><td class="c">${escapeHtml(String(box))}</td><td class="c">${escapeHtml(formatNumber(item.qty))}</td><td class="l">${escapeHtml(item.itemNote || '')}</td></tr>`;
  }).join('');
  const totalPallet = data.items.reduce((sum, item) => sum + Number(item.customPallet ?? calculatePallet(item) ?? 0), 0);
  const totalBox = data.items.reduce((sum, item) => sum + Number(item.customBox ?? calculateBox(item) ?? 0), 0);
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);
  return `<div class="doc release-doc"><div class="release-approval-row"><div class="approval-grid"><div class="approval-group"><div class="approval-cell"><div class="approval-hd">과장</div><div class="approval-body"></div></div><div class="approval-cell"><div class="approval-hd">부장</div><div class="approval-body"></div></div></div><div class="approval-group"><div class="approval-cell"><div class="approval-hd">상무</div><div class="approval-body"></div></div><div class="approval-cell"><div class="approval-hd">대표</div><div class="approval-body"></div></div></div></div></div><div class="doc-title">출 고 의 뢰 서</div><div class="doc-subtitle">수신: ${escapeHtml(data.receiver || '수신처 미입력')}&emsp;|&emsp;담당자 ${escapeHtml(data.manager || '-')}&emsp;|&emsp;발급 No. <strong>${escapeHtml(data.issueNo || '-')}</strong></div><table class="doc-tbl"><thead><tr><th>No</th><th>발주일</th><th>입고일</th><th>납품처</th><th>품목명</th><th>파렛트</th><th>BOX</th><th>수량</th><th>비고</th></tr></thead><tbody>${rows}<tr class="sum-row"><td class="c" colspan="5">합계</td><td class="c">${escapeHtml(String(totalPallet))}</td><td class="c">${escapeHtml(String(totalBox))}</td><td class="c">${escapeHtml(formatNumber(totalQty))}</td><td></td></tr></tbody></table><table class="doc-info-tbl">${data.manager || data.managerTel ? `<tr><td class="lbl">납품처 담당자</td><td>${escapeHtml(data.manager || '')}${data.managerTel ? `&emsp;(${escapeHtml(data.managerTel)})` : ''}</td></tr>` : ''}${data.deliveryAddr ? `<tr><td class="lbl">납품처 주소</td><td>${escapeHtml(data.deliveryAddr)}</td></tr>` : ''}${data.remark ? `<tr><td class="lbl">비고</td><td>${escapeHtml(data.remark)}</td></tr>` : ''}</table>${data.requestNote ? `<div class="request-box"><strong>요청사항</strong>${escapeHtml(data.requestNote).replace(/\n/g, '<br>')}</div>` : ''}<div class="release-signoff">${escapeHtml(formatKoreanDate(data.orderDate || today))}<br><strong>디케이앤에이치</strong></div></div>`;
}

function buildInvoicePreviewHtml(data: DocumentHistory) {
  const rows = data.items.map((item) => {
    const supply = item.supply || Math.round(item.unitPrice * item.qty);
    const vatAmount = item.vat ? Math.round(supply * 0.1) : 0;
    const arrive = formatMonthDay(item.arriveDate || data.arriveDate || data.orderDate || '');
    return `<tr><td class="c">${escapeHtml(arrive)}</td><td class="l">${escapeHtml(item.name2 || item.name1)}</td><td class="r">${escapeHtml(formatNumber(item.qty))}</td><td class="r">${item.unitPrice ? escapeHtml(formatNumber(item.unitPrice)) : ''}</td><td class="r">${supply ? escapeHtml(formatNumber(supply)) : ''}</td><td class="r">${item.vat ? escapeHtml(formatNumber(vatAmount)) : ''}</td><td class="l">${escapeHtml(item.itemNote || '')}</td></tr>`;
  }).join('');
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);
  const issueDateFmt = data.arriveDate || data.orderDate ? formatKoreanDate(data.arriveDate || data.orderDate || '') : '미입력';
  const piece = (suffix: string) => `<div class="invoice-doc"><div class="invoice-title">거 래 명 세 서<span>${suffix}</span></div><table class="invoice-head-table"><tr><td class="buyer-cell"><table class="inner-table"><tr><td colspan="2" class="c">${escapeHtml(issueDateFmt)}</td></tr><tr><td class="c strong">${escapeHtml(data.client || '')}</td><td class="c narrow">귀하</td></tr><tr><td colspan="2" class="c">아래와 같이 계산합니다.</td></tr><tr><td colspan="2" class="c">( ₩<span class="amount">${escapeHtml(formatNumber(data.totalAmount))}</span> ) VAT 포함</td></tr></table></td><td class="seller-cell"><table class="inner-table"><tr><td rowspan="4" class="vertical">공<br>급<br>자</td><td class="c label">등록<br>번호</td><td colspan="3" class="c strong">113 - 88 - 02729</td></tr><tr><td class="c label">상호</td><td class="c strong">디케이앤에이치</td><td class="c label narrow">성명</td><td class="c">김 주 영</td></tr><tr><td class="c label">사업장<br>주소</td><td colspan="3" class="c">서울 동대문구 천호대로 21, 5층 507호</td></tr><tr><td class="c label">업태</td><td class="c">도매 및 소매업</td><td class="c label narrow">종목</td><td class="c">식품용기류(플라스틱용기)</td></tr></table></td></tr></table><table class="invoice-total-table"><tr><td class="label-cell">합계금액</td><td class="value-cell">${escapeHtml(formatNumber(data.totalAmount))} 원</td></tr></table><table class="invoice-items-table"><thead><tr><th>입고일</th><th>품목</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th><th>비고</th></tr></thead><tbody>${rows}<tr class="sum-row"><td colspan="2" class="c">합계</td><td class="r">${escapeHtml(formatNumber(totalQty))}</td><td></td><td class="r">${escapeHtml(formatNumber(data.totalSupply))}</td><td class="r">${escapeHtml(formatNumber(data.totalVat))}</td><td></td></tr><tr class="grand-row"><td colspan="4" class="c">총 합 계</td><td class="r">${escapeHtml(formatNumber(data.totalAmount))}</td><td class="c">인수자</td><td></td></tr></tbody></table><div class="invoice-note-area">${data.remark ? `<div><strong>참고사항 : </strong>${escapeHtml(data.remark)}</div>` : ''}<div><strong>납품처 : </strong>${escapeHtml(data.client || '')}${data.deliveryAddr ? ` / ${escapeHtml(data.deliveryAddr)}` : ''}</div>${data.manager || data.managerTel ? `<div><strong>담당자 : </strong>${escapeHtml(data.manager || '')}${data.managerTel ? ` / ${escapeHtml(data.managerTel)}` : ''}</div>` : ''}${data.requestNote ? `<div><strong>요청사항 : </strong>${escapeHtml(data.requestNote).replace(/\n/g, ' ')}</div>` : ''}<div class="issue-line">발급 No. ${escapeHtml(data.issueNo)}</div></div></div>`;
  return `<div class="invoice-page">${piece('(공급자용)')}<div class="invoice-break"></div>${piece('(공급받는자용)')}</div>`;
}

function getReleasePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.release-doc{width:${printMode ? '100%' : '1160px'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:22px 28px;box-sizing:border-box}.release-approval-row{display:flex;justify-content:flex-end;margin-bottom:6px}.approval-grid{display:flex;width:360px}.approval-group{display:flex;flex:1;border:1px solid #999}.approval-group+.approval-group{margin-left:-1px;border-left:2px solid #333}.approval-cell{flex:1;text-align:center;border-right:1px solid #999}.approval-cell:last-child{border-right:none}.approval-hd{background:#f0f0f0;font-weight:600;font-size:9.5pt;padding:4px;border-bottom:1px solid #999}.approval-body{height:34px}.doc-title{font-size:22pt;font-weight:900;letter-spacing:.2em;margin-bottom:16px;text-align:left}.doc-subtitle{font-size:12pt;margin-bottom:8px;text-align:left}.doc-tbl,.doc-info-tbl{width:100%;border-collapse:collapse}.doc-tbl{font-size:12pt;margin-bottom:8px}.doc-tbl th,.doc-tbl td{border:1px solid #000;padding:5px 7px;vertical-align:middle}.doc-tbl th{background:#f7f7f7;font-weight:700}.doc-tbl .c{text-align:center}.doc-tbl .l{text-align:left}.doc-tbl .sum-row{background:#f0f0f0;font-weight:700}.doc-info-tbl{font-size:12pt;margin-bottom:6px}.doc-info-tbl td{border:1px solid #bdbdbd;padding:3px 6px}.doc-info-tbl .lbl{width:140px;background:#f7f7f7;font-weight:700}.request-box{border:1px solid #ccc;border-radius:4px;padding:6px 10px;margin-top:6px;font-size:10pt;line-height:1.5}.request-box strong{display:block;margin-bottom:2px;font-size:8.5pt}.release-signoff{text-align:right;margin-top:24px;font-size:10pt;line-height:2}.release-signoff strong{font-size:13pt;letter-spacing:.1em}@media print{@page{size:A4 landscape;margin:10mm 12mm}body{background:#fff}.release-doc{width:100%;margin:0;padding:0}}`;
}

function getInvoicePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.invoice-page{width:${printMode ? '100%' : '860px'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:${printMode ? '0' : '18px'};box-sizing:border-box}.invoice-doc{page-break-inside:avoid;break-inside:avoid}.invoice-break{border-top:1px dashed #aaa;margin:10px 0;padding-top:10px}.invoice-title{text-align:center;font-size:12pt;font-weight:900;margin-bottom:6px;letter-spacing:.1em}.invoice-title span{font-size:9pt;font-weight:400}.invoice-head-table,.invoice-total-table,.invoice-items-table,.inner-table{width:100%;border-collapse:collapse}.invoice-head-table{border:2px solid #000;margin-bottom:0}.invoice-head-table td{vertical-align:middle;padding:0}.buyer-cell{width:40%;border-right:1px solid #000}.seller-cell{width:60%}.inner-table td{border-bottom:1px solid #000;border-right:1px solid #000;padding:2px 3px;font-size:9pt;vertical-align:middle}.inner-table tr:last-child td{border-bottom:0}.inner-table td:last-child{border-right:0}.inner-table .narrow{width:28px}.inner-table .label{width:48px}.inner-table .strong{font-weight:700}.inner-table .vertical{width:20px;text-align:center;line-height:1.4;vertical-align:middle}.inner-table .c{text-align:center}.invoice-total-table{border:2px solid #000;border-top:0}.invoice-total-table td{padding:4px 8px;font-size:9pt;font-weight:700;vertical-align:middle}.invoice-total-table .label-cell{width:20%;border-right:1px solid #000}.invoice-total-table .value-cell{text-align:right}.invoice-items-table{border:2px solid #000;border-top:0;text-align:center}.invoice-items-table th,.invoice-items-table td{border-right:1px solid #000;border-bottom:1px solid #000;padding:4px 2px;font-size:9pt;vertical-align:middle}.invoice-items-table th:last-child,.invoice-items-table td:last-child{border-right:0}.invoice-items-table tbody tr:last-child td{border-bottom:0}.invoice-items-table .l{text-align:left}.invoice-items-table .r{text-align:right}.invoice-items-table .c{text-align:center}.invoice-items-table .sum-row td,.invoice-items-table .grand-row td{font-weight:700}.invoice-note-area{margin-top:6px;font-size:9pt;line-height:1.4;text-align:left;padding:0 3px}.invoice-note-area .issue-line{margin-top:6px;color:#666}@media print{@page{margin:6mm 8mm;size:A4 portrait}body{background:#fff}.invoice-page{width:100%;margin:0;padding:0}.invoice-break{page-break-before:avoid;break-before:avoid}}`;
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatMonthDay(value: string) {
  if (!value) return '';
  return value.slice(5).replace('-', ' / ');
}

function formatKoreanDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year} 년 ${parseInt(month, 10)} 월 ${parseInt(day, 10)} 일`;
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return value.slice(0, 16).replace('T', ' ');
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNullableInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
