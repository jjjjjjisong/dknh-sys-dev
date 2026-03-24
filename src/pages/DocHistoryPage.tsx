import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDocuments, toggleDocumentCancelled, updateDocument } from '../api/documents';
import { fetchProductsByClient } from '../api/products';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { exportInvoiceToExcel } from '../utils/excelExport';
import DocumentPreviewModal, { PreviewType } from '../components/ui/DocumentPreviewModal';
import DocumentItemTable, { MANUAL_PRODUCT_ID, DEFAULT_GUBUN_OPTIONS } from '../components/ui/DocumentItemTable';
import type { SharedItemRow, ItemSummary } from '../components/ui/DocumentItemTable';
import { useDocumentItems } from '../hooks/useDocumentItems';
import type { DocumentHistory, DocumentHistoryItem } from '../types/document';
import type { SharedPreviewData as PreviewData } from '../types/documentPreview';
import type { Product } from '../types/product';
import { emptyToNull, parseNullableInteger, formatNumber } from '../utils/formatters';

const PAGE_SIZE = 20;

const today = new Date().toISOString().slice(0, 10);
const oneYearAgo = getDateOneYearAgo(today);
const oneYearLater = getDateOneYearLater(today);

export default function DocHistoryPage() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [draft, setDraft] = useState<DocumentHistory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const { items, setItems, itemSummaries, totals, addItem, removeItem, updateItem } = useDocumentItems([], products);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'author'>('all');
  const [dateFrom, setDateFrom] = useState(oneYearAgo);
  const [dateTo, setDateTo] = useState(oneYearLater);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);
  const [supplierSectionOpen, setSupplierSectionOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const saveLockRef = useRef(false);

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

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      if (!draft?.client) {
        setProducts([]);
        return;
      }

      try {
        const rows = await fetchProductsByClient(draft.client);
        if (!mounted) return;
        setProducts(rows);
        if (draft) {
          const mappedItems: SharedItemRow[] = draft.items.map((item) => {
            const matched = rows.find((p) => p.name1 === item.name1);
            const pId = matched ? matched.id : (item.name1 ? MANUAL_PRODUCT_ID : '');
            return {
              id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              productId: pId,
              manualName: pId === MANUAL_PRODUCT_ID ? item.name1 : '',
              manualGubun: pId === MANUAL_PRODUCT_ID ? (item.gubun || '기타') : '',
              orderDate: item.orderDate || draft.orderDate || '',
              arriveDate: item.arriveDate || draft.arriveDate || '',
              qty: item.qty || 0,
              customPallet: item.customPallet ?? null,
              customBox: item.customBox ?? null,
              unitPrice: item.unitPrice ?? null,
              customSupply: item.supply ?? null,
              vat: typeof item.vat === 'boolean' ? item.vat : true,
              releaseNote: item.releaseNote || '',
              invoiceNote: item.invoiceNote || '',
            };
          });
          setItems(mappedItems);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '품목 목록을 불러오지 못했습니다.');
      }
    }

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, [draft?.client]);

  useEffect(() => {
    if (!draft) {
      setItems([]);
      return;
    }

    const mappedItems: SharedItemRow[] = draft.items.map((item) => {
      const matched = products.find((p) => p.name1 === item.name1);
      const pId = matched ? matched.id : item.name1 ? MANUAL_PRODUCT_ID : '';

      return {
        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: pId,
        manualName: pId === MANUAL_PRODUCT_ID ? item.name1 : '',
        manualGubun: pId === MANUAL_PRODUCT_ID ? item.gubun || '기타' : '',
        orderDate: item.orderDate || draft.orderDate || '',
        arriveDate: item.arriveDate || draft.arriveDate || '',
        qty: item.qty || 0,
        customPallet: item.customPallet ?? null,
        customBox: item.customBox ?? null,
        unitPrice: item.unitPrice ?? null,
        customSupply: item.supply ?? null,
        vat: typeof item.vat === 'boolean' ? item.vat : true,
        releaseNote: item.releaseNote || '',
        invoiceNote: item.invoiceNote || '',
      };
    });

    setItems(mappedItems);
  }, [draft, products, setItems]);

  const filteredDocuments = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return documents.filter((doc) => {
      const docDate = doc.arriveDate || '';
      if (dateFrom && docDate && docDate < dateFrom) return false;
      if (dateTo && docDate && docDate > dateTo) return false;
      if (!search) return true;
      if (filterType === 'client') return doc.client.toLowerCase().includes(search);
      if (filterType === 'author') return doc.author.toLowerCase().includes(search);

      return [doc.issueNo, doc.client, doc.receiver, doc.author, doc.items.map((item) => `${item.name1} ${item.name2}`).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [dateFrom, dateTo, documents, filterType, keyword]);

  const pagedDocuments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDocuments.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredDocuments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, filterType, keyword]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredDocuments.length]);

  function openDocument(document: DocumentHistory) {
    navigate(`/doc-history/${document.id}`);
  }

  function closeEditor() {
    setPreviewType(null);
    navigate('/doc-history');
  }

  const previewData = useMemo<PreviewData | null>(() => {
    if (!draft) return null;
    const validItems = itemSummaries
      .map((summary, index) => {
        if (!summary.name1 || summary.qty <= 0) return null;
        const item = items[index];
        return {
          seq: index + 1,
          name1: summary.name1,
          name2: summary.name2,
          gubun: summary.gubun,
          qty: summary.qty,
          unitPrice: summary.unitPrice,
          supply: summary.supply,
          vat: item.vat,
          orderDate: emptyToNull(item.orderDate),
          arriveDate: emptyToNull(item.arriveDate),
          releaseNote: item.releaseNote.trim(),
          invoiceNote: item.invoiceNote.trim(),
          eaPerB: summary.eaPerB,
          boxPerP: summary.boxPerP,
          pallet: summary.pallet,
          box: summary.box,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (validItems.length === 0) return null;

    return {
      issueNo: draft.issueNo,
      client: draft.client,
      manager: draft.manager || '',
      managerTel: draft.managerTel || '',
      receiver: draft.receiver || '',
      supplierBizNo: draft.supplierBizNo,
      supplierName: draft.supplierName,
      supplierOwner: draft.supplierOwner,
      supplierAddress: draft.supplierAddress,
      supplierBusinessType: draft.supplierBusinessType,
      supplierBusinessItem: draft.supplierBusinessItem,
      orderDate: emptyToNull(draft.orderDate || ''),
      arriveDate: emptyToNull(draft.arriveDate || ''),
      deliveryAddr: draft.deliveryAddr || '',
      remark: draft.remark || '',
      requestNote: draft.requestNote || '',
      totalSupply: totals.supply,
      totalVat: totals.vat,
      totalAmount: totals.total,
      items: validItems,
    };
  }, [draft, itemSummaries, items, totals]);


  function updateDraft<K extends keyof DocumentHistory>(key: K, value: DocumentHistory[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function buildDraftItems() {
    return itemSummaries
      .map((summary, index) => {
        if (!summary.name1 || summary.qty <= 0) return null;

        const item = items[index];
        const existingItem = draft?.items.find((row) => row.id === item.id);

        return {
          id: existingItem?.id ?? item.id,
          seq: index + 1,
          name1: summary.name1,
          name2: summary.name2,
          gubun: summary.gubun,
          qty: summary.qty,
          unitPrice: summary.unitPrice,
          supply: summary.supply,
          vat: item.vat,
          orderDate: emptyToNull(item.orderDate),
          arriveDate: emptyToNull(item.arriveDate),
          releaseNote: item.releaseNote.trim(),
          invoiceNote: item.invoiceNote.trim(),
          eaPerB: summary.eaPerB,
          boxPerP: summary.boxPerP,
          customPallet: item.customPallet,
          customBox: item.customBox,
          delYn: existingItem?.delYn ?? 'N',
          updatedAt: existingItem?.updatedAt ?? null,
          updatedBy: existingItem?.updatedBy ?? '',
        };
      })
      .filter((item): item is DocumentHistoryItem => item !== null);
  }

  async function handleSave() {
    if (!draft || saveLockRef.current || saving) return;

    try {
      saveLockRef.current = true;
      setSaving(true);
      setError(null);
      const nextDraft: DocumentHistory = {
        ...draft,
        items: buildDraftItems(),
        totalSupply: totals.supply,
        totalVat: totals.vat,
        totalAmount: totals.total,
      };
      await updateDocument(nextDraft);
      setDraft(nextDraft);
      await reload();
      window.alert('수정 저장이 완료되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 저장에 실패했습니다.');
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  async function handleToggleCancel() {
    if (!draft || saveLockRef.current || saving) return;
    const nextStatus = draft.status === 'ST01' ? 'ST00' : 'ST01';
    const nextCancelled = nextStatus === 'ST01';

    try {
      saveLockRef.current = true;
      setSaving(true);
      setError(null);
      await toggleDocumentCancelled(draft.id, nextCancelled);
      setDraft((current) => (current ? { ...current, status: nextStatus } : current));
      setDocuments((current) =>
        current.map((document) =>
          document.id === draft.id ? { ...document, status: nextStatus } : document,
        ),
      );
      await reload();
      window.alert(nextCancelled ? '거래취소 처리되었습니다.' : '거래취소가 해제되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }



  async function exportToExcel() {
    if (!draft) return;
    try {
      await exportInvoiceToExcel(draft as any);
    } catch (err) {
      window.alert('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title={draft ? '발행이력 상세' : '발행 이력'}
        description=""
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {!draft ? (
        <>
          <section className="card">
            <div className="history-filter-grid">
              <label className="field history-date-field">
                <span>입고일(시작)</span>
                <input className="history-date-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label className="field history-date-field">
                <span>입고일(종료)</span>
                <input className="history-date-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
              <label className="field">
                <span>검색 필터</span>
                <select className="history-filter-select" value={filterType} onChange={(event) => setFilterType(event.target.value as 'all' | 'client' | 'author')}>
                  <option value="all">전체</option>
                  <option value="client">납품업체</option>
                  <option value="author">작성자</option>
                </select>
              </label>
              <label className="field">
                <span>키워드</span>
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="검색어를 입력해주세요." />
              </label>
            </div>
          </section>

          <section className="card">
            {loading ? (
              <div className="empty-state">발행 이력을 불러오는 중입니다...</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 90, textAlign: 'center' }}>발급번호</th>
                      <th style={{ width: 120, textAlign: 'center' }}>발주일자</th>
                      <th style={{ width: 120, textAlign: 'center' }}>입고일자</th>
                      <th style={{ minWidth: 180 }}>납품처</th>
                      <th style={{ minWidth: 150 }}>수신처</th>
                      <th style={{ minWidth: 220 }}>품목명</th>
                      <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                      <th style={{ width: 90, textAlign: 'right' }}>파렛트</th>
                      <th style={{ width: 80, textAlign: 'right' }}>박스</th>
                      <th style={{ width: 90, textAlign: 'center' }}>작성자</th>
                      <th style={{ width: 180, textAlign: 'center' }}>수정/저장일시</th>
                      <th style={{ width: 90, textAlign: 'center' }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="table-empty" style={{ textAlign: 'center' }}>
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      pagedDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => openDocument(doc)}
                          className={doc.status === 'ST01' ? 'history-row-cancelled' : undefined}
                        >
                          <td style={{ textAlign: 'center' }}>{doc.issueNo}</td>
                          <td style={{ textAlign: 'center' }}>{doc.orderDate || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{doc.arriveDate || '-'}</td>
                          <td style={{ fontWeight: 700 }}>{doc.client}</td>
                          <td>{doc.receiver || '-'}</td>
                          <td>{summarizeItemNames(doc.items)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(sumItemQty(doc.items))}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(sumItemPallet(doc.items))}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(sumItemBox(doc.items))}</td>
                          <td style={{ textAlign: 'center' }}>{doc.author || '-'}</td>
                          <td style={{ textAlign: 'center' }}>{formatCompactDateTime(doc.updatedAt || doc.createdAt)}</td>
                          <td style={{ textAlign: 'center' }}>{doc.status === 'ST01' ? '거래취소' : ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredDocuments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </section>
        </>
      ) : (
        <section className="card">
          <div className="detail-stack">
            <div className="doc-form-grid">
              <label className="field"><span>발주일</span><input type="date" value={draft.orderDate || ''} onChange={(event) => updateDraft('orderDate', emptyToNull(event.target.value))} /></label>
              <label className="field"><span>입고일</span><input type="date" value={draft.arriveDate || ''} onChange={(event) => updateDraft('arriveDate', emptyToNull(event.target.value))} /></label>
              <label className="field"><span>발급번호</span><input value={draft.issueNo} onChange={(event) => updateDraft('issueNo', event.target.value)} /></label>

              <label className="field"><span>납품처</span><input value={draft.client} onChange={(event) => updateDraft('client', event.target.value)} /></label>
              <label className="field"><span>담당자</span><input value={draft.manager} onChange={(event) => updateDraft('manager', event.target.value)} /></label>
              <label className="field"><span>담당자 연락처</span><input value={draft.managerTel} onChange={(event) => updateDraft('managerTel', event.target.value)} /></label>

              <label className="field"><span>수신처</span><input value={draft.receiver} onChange={(event) => updateDraft('receiver', event.target.value)} /></label>
              <label className="field field-span-2-cols"><span>납품주소</span><input value={draft.deliveryAddr} onChange={(event) => updateDraft('deliveryAddr', event.target.value)} /></label>

              <label className="field field-span-2"><span>유의사항</span><textarea rows={2} value={draft.remark} onChange={(event) => updateDraft('remark', event.target.value)} /></label>
              <label className="field field-span-2"><span>요청사항</span><textarea rows={2} value={draft.requestNote} onChange={(event) => updateDraft('requestNote', event.target.value)} /></label>
            </div>

            <section className="card">
              <div className="card-header">
                <div>
                  <h2>공급자 정보</h2>
                </div>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setSupplierSectionOpen((current) => !current)}
                >
                  {supplierSectionOpen ? '접기' : '펼치기'}
                </button>
              </div>

              {supplierSectionOpen ? (
                <div className="doc-form-grid">
                  <label className="field"><span>등록번호</span><input value={draft.supplierBizNo} onChange={(event) => updateDraft('supplierBizNo', event.target.value)} /></label>
                  <label className="field"><span>상호</span><input value={draft.supplierName} onChange={(event) => updateDraft('supplierName', event.target.value)} /></label>
                  <label className="field"><span>성명</span><input value={draft.supplierOwner} onChange={(event) => updateDraft('supplierOwner', event.target.value)} /></label>
                  <label className="field field-span-2"><span>사업장주소</span><textarea value={draft.supplierAddress} onChange={(event) => updateDraft('supplierAddress', event.target.value)} /></label>
                  <label className="field"><span>업태</span><input value={draft.supplierBusinessType} onChange={(event) => updateDraft('supplierBusinessType', event.target.value)} /></label>
                  <label className="field"><span>종목</span><input value={draft.supplierBusinessItem} onChange={(event) => updateDraft('supplierBusinessItem', event.target.value)} /></label>
                </div>
              ) : null}
            </section>

            <DocumentItemTable
              items={items}
              clientProducts={products}
              itemSummaries={itemSummaries}
              totals={totals}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onAddItem={() => addItem(draft?.orderDate || '', draft?.arriveDate || '')}
            />

            <div className="doc-action-stack inline">
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? '저장 중..' : '수정 저장'}</button>
              <button className={draft.status === 'ST01' ? 'btn btn-secondary' : 'btn btn-danger'} disabled={saving} onClick={handleToggleCancel}>
                {draft.status === 'ST01' ? '취소 해제' : '거래취소'}
              </button>
              <button className="btn btn-secondary" onClick={() => setPreviewType('release')}>출고의뢰서</button>
              <button className="btn btn-primary" onClick={() => setPreviewType('invoice')}>거래명세서</button>
              <button className="btn btn-secondary" style={{ backgroundColor: '#217346', color: 'white', borderColor: '#217346' }} onClick={exportToExcel}>엑셀 다운로드</button>
            </div>
          </div>
        </section>
      )}

      {previewType && previewData ? (
        <DocumentPreviewModal
          type={previewType}
          data={previewData}
          onClose={() => setPreviewType(null)}
          description="발행 이력에서 수정한 내역이 반영된 미리보기입니다."
        />
      ) : null}
    </div>
  );
}

function cloneDocument(document: DocumentHistory): DocumentHistory {
  return { ...document, items: document.items.map((item) => ({ ...item })) };
}

function findProductOptionValue(item: DocumentHistoryItem, products: Product[]) {
  const matched = products.find((product) => product.name1 === item.name1);
  if (matched) return matched.id;
  return item.name1 ? MANUAL_PRODUCT_ID : '';
}

function isManualItem(item: DocumentHistoryItem, products: Product[]) {
  return findProductOptionValue(item, products) === MANUAL_PRODUCT_ID;
}

function calculatePallet(item: DocumentHistoryItem) {
  const eaPerP = item.eaPerB && item.boxPerP ? item.eaPerB * item.boxPerP : null;
  return eaPerP ? Math.ceil(item.qty / eaPerP) : '';
}

function calculateBox(item: DocumentHistoryItem) {
  return item.eaPerB ? Math.ceil(item.qty / item.eaPerB) : '';
}

function sumItemQty(items: DocumentHistoryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function sumItemPallet(items: DocumentHistoryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.customPallet ?? calculatePallet(item) ?? 0), 0);
}

function sumItemBox(items: DocumentHistoryItem[]) {
  return items.reduce((sum, item) => sum + Number(item.customBox ?? calculateBox(item) ?? 0), 0);
}

function summarizeItemNames(items: DocumentHistoryItem[]) {
  const names = items
    .map((item) => item.name2 || item.name1)
    .filter((name) => name && name.trim().length > 0);

  if (names.length === 0) return '-';
  if (names.length === 1) return names[0];
  return `${names[0]} 외 ${names.length - 1}건`;
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

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return value.slice(0, 16).replace('T', ' ');
}

function formatCompactDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function getDateOneYearAgo(baseDate: string) {
  const date = new Date(baseDate);
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().slice(0, 10);
}

function getDateOneYearLater(baseDate: string) {
  const date = new Date(baseDate);
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}



