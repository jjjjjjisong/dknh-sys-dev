import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchClients } from '../api/clients';
import { fetchDocuments, toggleDocumentCancelled, updateDocument } from '../api/documents';
import { fetchProductsByClientId } from '../api/products';
import { fetchSuppliers } from '../api/suppliers';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Modal from '../components/ui/Modal';
import { exportInvoiceToExcel } from '../utils/excelExport';
import DocumentPreviewModal, { PreviewType } from '../components/ui/DocumentPreviewModal';
import DocumentItemTable, { MANUAL_PRODUCT_ID } from '../components/ui/DocumentItemTable';
import type { SharedItemRow } from '../components/ui/DocumentItemTable';
import { buildHistoryDraftItems, buildSharedPreviewData } from '../features/documents/documentPreview';
import { useDocumentItems } from '../hooks/useDocumentItems';
import type { Client } from '../types/client';
import type { DocumentHistory, DocumentHistoryItem } from '../types/document';
import type { SharedPreviewData as PreviewData } from '../types/documentPreview';
import { RECEIVER_OPTIONS } from '../constants/receivers';
import type { Product } from '../types/product';
import type { Supplier } from '../types/supplier';
import { emptyToNull, formatNumber, getErrorMessage, getLocalDateInputValue } from '../utils/formatters';

const PAGE_SIZE = 20;

const today = getLocalDateInputValue();
const oneYearAgo = getDateOneYearAgo(today);
const oneYearLater = getDateOneYearLater(today);

function buildClientRemark(client: Client | null) {
  if (!client) return '';

  const parts = [
    client.time ? `입고시간 : ${client.time}` : '',
    client.lunch ? `점심시간 : ${client.lunch}` : '',
    client.note ? client.note : '',
  ].filter(Boolean);

  return parts.join(' / ');
}

export default function DocHistoryPage() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [draft, setDraft] = useState<DocumentHistory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { items, setItems, itemSummaries, totals, addItem, removeItem, updateItem } = useDocumentItems([], products);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'author'>('all');
  const [dateFrom, setDateFrom] = useState(oneYearAgo);
  const [dateTo, setDateTo] = useState(oneYearLater);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);
  const [supplierSectionOpen, setSupplierSectionOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierKeyword, setSupplierKeyword] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [receiverDropdownOpen, setReceiverDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const saveLockRef = useRef(false);
  const prevBaseOrderDateRef = useRef('');
  const prevBaseArriveDateRef = useRef('');

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      try {
        const rows = await fetchClients();
        if (!mounted) return;
        setClients(rows.filter((client) => client.active !== false));
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err, '납품처 목록을 불러오지 못했습니다.'));
      }
    }

    void loadClients();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSuppliers() {
      try {
        const rows = await fetchSuppliers();
        if (!mounted) return;
        setSuppliers(rows.filter((supplier) => supplier.active !== false));
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err, '공급자 목록을 불러오지 못했습니다.'));
      }
    }

    void loadSuppliers();

    return () => {
      mounted = false;
    };
  }, []);

  async function reload() {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchDocuments();
      setDocuments(rows);
    } catch (err) {
      setError(getErrorMessage(err, '발행 이력을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!documentId) {
      setDraft(null);
      prevBaseOrderDateRef.current = '';
      prevBaseArriveDateRef.current = '';
      return;
    }

    const selected = documents.find((row) => row.id === documentId) ?? null;
    const nextDraft = selected ? cloneDocument(selected) : null;
    prevBaseOrderDateRef.current = nextDraft?.orderDate || '';
    prevBaseArriveDateRef.current = nextDraft?.arriveDate || '';
    setDraft(nextDraft);
  }, [documentId, documents]);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      if (!draft?.clientId) {
        setProducts([]);
        return;
      }

      try {
        const rows = await fetchProductsByClientId(draft.clientId);
        if (!mounted) return;
        setProducts(rows);
        setItems(mapDraftItemsToSharedRows(draft, rows));
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err, '품목 목록을 불러오지 못했습니다.'));
      }
    }

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, [draft?.clientId, draft?.id, setItems]);

  useEffect(() => {
    if (!draft) {
      setItems([]);
      return;
    }

    setItems(mapDraftItemsToSharedRows(draft, products));
  }, [draft?.id, products, setItems]);

  useEffect(() => {
    if (!draft) return;

    const previousOrderDate = prevBaseOrderDateRef.current;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        orderDate:
          !item.orderDate || item.orderDate === previousOrderDate
            ? draft.orderDate || ''
            : item.orderDate,
      })),
    );
    prevBaseOrderDateRef.current = draft.orderDate || '';
  }, [draft?.orderDate, setItems]);

  useEffect(() => {
    if (!draft) return;

    const previousArriveDate = prevBaseArriveDateRef.current;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        arriveDate:
          !item.arriveDate || item.arriveDate === previousArriveDate
            ? draft.arriveDate || ''
            : item.arriveDate,
      })),
    );
    prevBaseArriveDateRef.current = draft.arriveDate || '';
  }, [draft?.arriveDate, setItems]);

  const filteredDocuments = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return documents.filter((doc) => {
      const docDate = doc.arriveDate || '';
      if (dateFrom && docDate && docDate < dateFrom) return false;
      if (dateTo && docDate && docDate > dateTo) return false;
      if (!search) return true;
      if (filterType === 'client') return doc.client.toLowerCase().includes(search);
      if (filterType === 'author') return doc.author.toLowerCase().includes(search);

      return [
        doc.issueNo,
        doc.client,
        doc.receiver,
        doc.author,
        doc.items.map((item) => `${item.name1} ${item.name2}`).join(' '),
      ]
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

  const filteredSuppliers = useMemo(() => {
    const search = supplierKeyword.trim().toLowerCase();
    if (!search) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.bizNo,
        supplier.owner,
        supplier.address,
        supplier.businessType,
        supplier.businessItem,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [supplierKeyword, suppliers]);

  const filteredClients = useMemo(() => {
    const keyword = draft?.client.trim().toLowerCase() ?? '';
    if (!keyword) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(keyword));
  }, [clients, draft?.client]);

  const filteredReceivers = useMemo(() => {
    const keyword = draft?.receiver.trim().toLowerCase() ?? '';
    if (!keyword) return RECEIVER_OPTIONS;
    return RECEIVER_OPTIONS.filter((receiver) => receiver.toLowerCase().includes(keyword));
  }, [draft?.receiver]);

  const previewData = useMemo<PreviewData | null>(() => {
    if (!draft) return null;
    return buildSharedPreviewData(
      {
        issueNo: draft.issueNo,
        clientId: draft.clientId,
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
        orderDate: draft.orderDate || '',
        arriveDate: draft.arriveDate || '',
        deliveryAddr: draft.deliveryAddr || '',
        remark: draft.remark || '',
        requestNote: draft.requestNote || '',
      },
      itemSummaries,
      items,
      totals,
    );
  }, [draft, itemSummaries, items, totals]);

  function openDocument(document: DocumentHistory) {
    navigate(`/doc-history/${document.id}`);
  }

  function updateDraft<K extends keyof DocumentHistory>(key: K, value: DocumentHistory[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function resetDraftProducts() {
    setItems((current) =>
      current.map((item) =>
        item.productId && item.productId !== MANUAL_PRODUCT_ID
          ? { ...item, productId: '', unitPrice: null, customSupply: null }
          : item,
      ),
    );
  }

  function applyDraftClient(client: Client | null, clientName?: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            clientId: client?.id ?? null,
            client: client?.name ?? clientName ?? '',
            manager: client?.manager ?? '',
            managerTel: client?.tel ?? '',
            deliveryAddr: client?.addr ?? '',
            remark: client ? buildClientRemark(client) : '',
          }
        : current,
    );
    resetDraftProducts();
  }

  function handleDraftClientInputChange(clientName: string) {
    applyDraftClient(null, clientName);
  }

  function handleDraftClientSelect(client: Client) {
    applyDraftClient(client);
  }

  function addDraftItem() {
    if (!draft?.clientId) {
      window.alert('납품처를 목록에서 다시 선택해 주세요.');
      return;
    }
    addItem(draft?.orderDate || '', draft?.arriveDate || '');
  }

  function applySupplier(supplier: Supplier) {
    setDraft((current) =>
      current
        ? {
            ...current,
            supplierBizNo: supplier.bizNo,
            supplierName: supplier.name,
            supplierOwner: supplier.owner,
            supplierAddress: supplier.address,
            supplierBusinessType: supplier.businessType,
            supplierBusinessItem: supplier.businessItem,
          }
        : current,
    );
  }

  async function openSupplierModal() {
    try {
      setSupplierLoading(true);
      setError(null);
      const rows = await fetchSuppliers();
      setSuppliers(rows.filter((supplier) => supplier.active !== false));
      setSupplierModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, '공급자 목록을 불러오지 못했습니다.'));
    } finally {
      setSupplierLoading(false);
    }
  }

  function handleSelectSupplier(supplier: Supplier) {
    applySupplier(supplier);
    setSupplierModalOpen(false);
    setSupplierKeyword('');
  }

  function buildDraftItems() {
    return buildHistoryDraftItems(draft, itemSummaries, items);
  }

  async function handleSave() {
    if (!draft || saveLockRef.current || saving) return;
    if (!draft.clientId) {
      window.alert('납품처를 목록에서 다시 선택해 주세요.');
      return;
    }

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
      setError(getErrorMessage(err, '수정 저장에 실패했습니다.'));
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
      window.alert(nextCancelled ? '거래취소 처리되었습니다.' : '거래취소를 해제했습니다.');
    } catch (err) {
      setError(getErrorMessage(err, '상태 변경에 실패했습니다.'));
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  async function exportToExcel() {
    if (!previewData) {
      window.alert('엑셀 다운로드 전에 품목을 먼저 확인해 주세요.');
      return;
    }
    try {
      await exportInvoiceToExcel(previewData as any);
    } catch (err) {
      window.alert('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader title={draft ? '발행이력 상세' : '발행 이력'} description="" />

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
                  <option value="client">거래처</option>
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
                      <th style={{ minWidth: 180 }}>거래처</th>
                      <th style={{ minWidth: 150 }}>수신처</th>
                      <th style={{ minWidth: 220 }}>품목명</th>
                      <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                      <th style={{ width: 90, textAlign: 'right' }}>파레트</th>
                      <th style={{ width: 80, textAlign: 'right' }}>박스</th>
                      <th style={{ width: 90, textAlign: 'center' }}>작성자</th>
                      <th style={{ width: 180, textAlign: 'center' }}>수정/등록일시</th>
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
        <>
          <section className="doc-main-stack">
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>기본 정보</h2>
                </div>
              </div>

              <div className="doc-form-grid">
                <label className="field"><span>발주일</span><input type="date" value={draft.orderDate || ''} onChange={(event) => updateDraft('orderDate', emptyToNull(event.target.value))} /></label>
                <label className="field"><span>입고일</span><input type="date" value={draft.arriveDate || ''} onChange={(event) => updateDraft('arriveDate', emptyToNull(event.target.value))} /></label>
                <label className="field"><span>발급번호</span><input value={draft.issueNo} onChange={(event) => updateDraft('issueNo', event.target.value)} /></label>
                <label className="field">
                  <span>거래처</span>
                  <div className="client-search-box">
                    <input
                      className="search-input"
                      value={draft.client}
                      onChange={(event) => {
                        handleDraftClientInputChange(event.target.value);
                        setClientDropdownOpen(true);
                      }}
                      onFocus={() => setClientDropdownOpen(true)}
                      onBlur={() => window.setTimeout(() => setClientDropdownOpen(false), 120)}
                      placeholder="납품처 검색 또는 선택"
                    />
                    <span className="client-search-caret" aria-hidden="true" />
                    {clientDropdownOpen && filteredClients.length > 0 ? (
                      <div className="client-search-dropdown">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className="client-search-option"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleDraftClientSelect(client);
                              setClientDropdownOpen(false);
                            }}
                          >
                            {client.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className="field"><span>담당자</span><input value={draft.manager} onChange={(event) => updateDraft('manager', event.target.value)} /></label>
                <label className="field"><span>담당자 연락처</span><input value={draft.managerTel} onChange={(event) => updateDraft('managerTel', event.target.value)} /></label>
                <label className="field">
                  <span>수신처</span>
                  <div className="client-search-box">
                    <input
                      className="search-input"
                      value={draft.receiver}
                      onChange={(event) => {
                        updateDraft('receiver', event.target.value);
                        setReceiverDropdownOpen(true);
                      }}
                      onFocus={() => setReceiverDropdownOpen(true)}
                      onBlur={() => window.setTimeout(() => setReceiverDropdownOpen(false), 120)}
                      placeholder="수신처 검색 또는 선택"
                    />
                    <span className="client-search-caret" aria-hidden="true" />
                    {receiverDropdownOpen && filteredReceivers.length > 0 ? (
                      <div className="client-search-dropdown">
                        {filteredReceivers.map((receiver) => (
                          <button
                            key={receiver}
                            type="button"
                            className="client-search-option"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              updateDraft('receiver', receiver);
                              setReceiverDropdownOpen(false);
                            }}
                          >
                            {receiver}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className="field field-span-2-cols"><span>납품주소</span><input value={draft.deliveryAddr} onChange={(event) => updateDraft('deliveryAddr', event.target.value)} /></label>
                <label className="field field-span-2"><span>유의사항</span><textarea rows={2} value={draft.remark} onChange={(event) => updateDraft('remark', event.target.value)} /></label>
                <label className="field field-span-2"><span>요청사항</span><textarea rows={2} value={draft.requestNote} onChange={(event) => updateDraft('requestNote', event.target.value)} /></label>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <div>
                  <h2>공급자 정보</h2>
                </div>
                <div className="button-row">
                  <button className="btn btn-secondary" type="button" onClick={() => void openSupplierModal()}>
                    불러오기
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setSupplierSectionOpen((current) => !current)}
                  >
                    {supplierSectionOpen ? '접기' : '펼치기'}
                  </button>
                </div>
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
              onAddItem={addDraftItem}
            />
          </section>

          <div className="doc-sticky-actions">
            <div className="doc-action-stack inline doc-action-stack-sticky">
              <button className="btn btn-secondary doc-sticky-action-button" onClick={() => setPreviewType('release')}>출고의뢰서</button>
              <button className="btn btn-secondary doc-sticky-action-button" onClick={() => setPreviewType('invoice')}>거래명세서</button>
              <button className="btn btn-secondary doc-sticky-action-button" style={{ backgroundColor: '#217346', color: 'white', borderColor: '#217346' }} onClick={exportToExcel}>엑셀 다운로드</button>
              <button className={draft.status === 'ST01' ? 'btn btn-secondary doc-sticky-action-button' : 'btn btn-danger doc-sticky-action-button'} disabled={saving} onClick={handleToggleCancel}>
                {draft.status === 'ST01' ? '취소 해제' : '거래취소'}
              </button>
              <button className="btn btn-primary doc-sticky-action-button" disabled={saving} onClick={handleSave}>{saving ? '저장 중..' : '수정 저장'}</button>
            </div>
          </div>
        </>
      )}

      {previewType && previewData ? (
        <DocumentPreviewModal
          type={previewType}
          data={previewData}
          onClose={() => setPreviewType(null)}
          description="발행 이력에서 수정한 내용을 반영한 미리보기입니다."
        />
      ) : null}

      <Modal
        open={supplierModalOpen}
        cardClassName="supplier-import-modal-card history-supplier-modal-card"
        title="공급자 불러오기"
        onClose={() => {
          if (supplierLoading) return;
          setSupplierModalOpen(false);
          setSupplierKeyword('');
        }}
        closeOnOverlayClick={false}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSupplierModalOpen(false);
              setSupplierKeyword('');
            }}
            disabled={supplierLoading}
          >
            닫기
          </button>
        }
      >
        <div className="modal-head-actions">
          <input
            className="search-input"
            value={supplierKeyword}
            onChange={(event) => setSupplierKeyword(event.target.value)}
            placeholder="상호, 등록번호, 성명, 주소로 검색"
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>상호</th>
                <th style={{ width: 160 }}>등록번호</th>
                <th style={{ width: 110 }}>성명</th>
                <th style={{ minWidth: 220 }}>사업장주소</th>
                <th style={{ width: 120 }}>업태</th>
                <th style={{ width: 150 }}>종목</th>
                <th className="doc-import-select-column" aria-label="불러오기" />
              </tr>
            </thead>
            <tbody>
              {supplierLoading ? (
                <tr>
                  <td colSpan={7} className="table-empty">공급자 목록을 불러오는 중입니다...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">검색 결과가 없습니다.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="modal-select-row"
                    onDoubleClick={() => handleSelectSupplier(supplier)}
                  >
                    <td><div className="supplier-modal-name" title={supplier.name}>{supplier.name}</div></td>
                    <td>{supplier.bizNo || '-'}</td>
                    <td>{supplier.owner || '-'}</td>
                    <td><div className="supplier-modal-address" title={supplier.address || '-'}>{supplier.address || '-'}</div></td>
                    <td>{supplier.businessType || '-'}</td>
                    <td><div className="table-clamp-2" title={supplier.businessItem || '-'}>{supplier.businessItem || '-'}</div></td>
                    <td />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

function cloneDocument(document: DocumentHistory): DocumentHistory {
  return { ...document, items: document.items.map((item) => ({ ...item })) };
}

function mapDraftItemsToSharedRows(draft: DocumentHistory, products: Product[]): SharedItemRow[] {
  return draft.items.map((item) => {
    const matched = item.productId ? products.find((product) => product.id === item.productId) ?? null : null;
    const productId = matched ? matched.id : item.productId ? '' : item.name1 ? MANUAL_PRODUCT_ID : '';
    const manualName = item.name2 || item.name1;

    return {
      id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId,
      manualName: productId === MANUAL_PRODUCT_ID ? manualName : '',
      manualGubun: productId === MANUAL_PRODUCT_ID ? item.gubun || '기타' : '',
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
