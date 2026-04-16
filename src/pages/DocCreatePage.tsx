import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClients } from '../api/clients';
import { fetchDocuments, fetchNextIssueNo, saveDocument } from '../api/documents';
import { fetchProductsByClientId } from '../api/products';
import { fetchSuppliers } from '../api/suppliers';
import PageHeader from '../components/PageHeader';
import { getStoredUser } from '../lib/session';
import { exportInvoiceToExcel } from '../utils/excelExport';
import DocumentPreviewModal, { PreviewType } from '../components/ui/DocumentPreviewModal';
import Modal from '../components/ui/Modal';
import DocumentItemTable, { MANUAL_PRODUCT_ID, DEFAULT_GUBUN_OPTIONS } from '../components/ui/DocumentItemTable';
import type { SharedItemRow as DocItem } from '../components/ui/DocumentItemTable';
import { buildDocumentPayload, buildSharedPreviewData } from '../features/documents/documentPreview';
import { useDocumentItems, createEmptySharedItem } from '../hooks/useDocumentItems';
import type { Client } from '../types/client';
import type { DocumentHistory, DocumentPayload } from '../types/document';
import type { Product } from '../types/product';
import type { Supplier } from '../types/supplier';
import type { SharedPreviewData as PreviewData } from '../types/documentPreview';
import { RECEIVER_OPTIONS } from '../constants/receivers';
import { emptyToNull, formatIntegerInput, parseNullableInteger, stripNonNumeric, formatNumber, getLocalDateInputValue } from '../utils/formatters';

const today = getLocalDateInputValue();

type DocForm = {
  issueNo: string;
  orderDate: string;
  arriveDate: string;
  clientId: string;
  client: string;
  manager: string;
  managerTel: string;
  receiver: string;
  deliveryAddr: string;
  remark: string;
  requestNote: string;
  supplierBizNo: string;
  supplierName: string;
  supplierOwner: string;
  supplierAddress: string;
  supplierBusinessType: string;
  supplierBusinessItem: string;
};



function createInitialForm(): DocForm {
  return {
    issueNo: '',
    orderDate: today,
    arriveDate: '',
    clientId: '',
    client: '',
    manager: '',
    managerTel: '',
    receiver: '',
    deliveryAddr: '',
    remark: '',
    requestNote: '',
    supplierBizNo: '',
    supplierName: '',
    supplierOwner: '',
    supplierAddress: '',
    supplierBusinessType: '',
    supplierBusinessItem: '',
  };
}

function buildClientRemark(client: Client | null) {
  if (!client) return '';

  const parts = [
    client.time ? `입고시간 : ${client.time}` : '',
    client.lunch ? `점심시간 : ${client.lunch}` : '',
    client.note ? client.note : '',
  ].filter(Boolean);

  return parts.join(' / ');
}

function hasSupplierValues(form: DocForm) {
  return [
    form.supplierBizNo,
    form.supplierName,
    form.supplierOwner,
    form.supplierAddress,
    form.supplierBusinessType,
    form.supplierBusinessItem,
  ].some((value) => value.trim().length > 0);
}

export default function DocCreatePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<DocForm>(createInitialForm);
  const clientProducts = useMemo(() => products, [products]);
  const { items, setItems, itemSummaries, totals, addItem: _addItem, removeItem, updateItem } = useDocumentItems([createEmptySharedItem(today, '')], clientProducts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supplierSectionOpen, setSupplierSectionOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [receiverDropdownOpen, setReceiverDropdownOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierKeyword, setSupplierKeyword] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importDocuments, setImportDocuments] = useState<DocumentHistory[]>([]);
  const [importKeyword, setImportKeyword] = useState('');
  const saveLockRef = useRef(false);
  const prevBaseOrderDateRef = useRef(form.orderDate);
  const prevBaseArriveDateRef = useRef(form.arriveDate);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      try {
        setLoading(true);
        setError(null);
        const [rows, supplierRows, nextIssueNo] = await Promise.all([
          fetchClients(),
          fetchSuppliers(),
          fetchNextIssueNo(),
        ]);
        if (!mounted) return;
        const activeClients = rows.filter((client) => client.active !== false);
        const activeSuppliers = supplierRows.filter((supplier) => supplier.active !== false);
        const defaultSupplier = activeSuppliers.find((supplier) => supplier.id === '1');

        setClients(activeClients);
        setSuppliers(activeSuppliers);
        setForm((current) => {
          if (!defaultSupplier || hasSupplierValues(current)) {
            return { ...current, issueNo: nextIssueNo };
          }

          return {
            ...current,
            issueNo: nextIssueNo,
            supplierBizNo: defaultSupplier.bizNo,
            supplierName: defaultSupplier.name,
            supplierOwner: defaultSupplier.owner,
            supplierAddress: defaultSupplier.address,
            supplierBusinessType: defaultSupplier.businessType,
            supplierBusinessItem: defaultSupplier.businessItem,
          };
        });
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '기본 정보를 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadClients();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      if (!form.clientId) {
        setProducts([]);
        return;
      }

      try {
        const rows = await fetchProductsByClientId(form.clientId);
        if (!mounted) return;
        setProducts(rows);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '품목 목록을 불러오지 못했습니다.');
      }
    }

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, [form.clientId]);

  useEffect(() => {
    const previousOrderDate = prevBaseOrderDateRef.current;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        orderDate:
          !item.orderDate || item.orderDate === previousOrderDate
            ? form.orderDate
            : item.orderDate,
      })),
    );
    prevBaseOrderDateRef.current = form.orderDate;
  }, [form.orderDate, setItems]);

  useEffect(() => {
    const previousArriveDate = prevBaseArriveDateRef.current;
    setItems((current) =>
      current.map((item) => ({
        ...item,
        arriveDate:
          !item.arriveDate || item.arriveDate === previousArriveDate
            ? form.arriveDate
            : item.arriveDate,
      })),
    );
    prevBaseArriveDateRef.current = form.arriveDate;
  }, [form.arriveDate, setItems]);

  const filteredClients = useMemo(() => {
    const keyword = form.client.trim().toLowerCase();
    if (!keyword) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(keyword));
  }, [clients, form.client]);

  const filteredReceivers = useMemo(() => {
    const keyword = form.receiver.trim().toLowerCase();
    if (!keyword) return RECEIVER_OPTIONS;
    return RECEIVER_OPTIONS.filter((receiver) => receiver.toLowerCase().includes(keyword));
  }, [form.receiver]);

  const previewData = useMemo<PreviewData | null>(() => {
    return buildSharedPreviewData(form, itemSummaries, items, totals);
  }, [form, itemSummaries, items, totals]);



  function updateForm<K extends keyof DocForm>(key: K, value: DocForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applySupplier(supplier: Supplier) {
    setForm((current) => ({
      ...current,
      supplierBizNo: supplier.bizNo,
      supplierName: supplier.name,
      supplierOwner: supplier.owner,
      supplierAddress: supplier.address,
      supplierBusinessType: supplier.businessType,
      supplierBusinessItem: supplier.businessItem,
    }));
  }

  function resetClientItems() {
    setItems((current) =>
      current.map((item) =>
        item.productId && item.productId !== MANUAL_PRODUCT_ID
          ? { ...item, productId: '', unitPrice: null, customSupply: null }
          : item,
      ),
    );
  }

  function applyClient(client: Client | null, clientName?: string) {
    const nextClientName = client?.name ?? clientName ?? '';
    setForm((current) => ({
      ...current,
      clientId: client?.id ?? '',
      client: nextClientName,
      manager: client?.manager ?? '',
      managerTel: client?.tel ?? '',
      deliveryAddr: client?.addr ?? '',
      remark: buildClientRemark(client),
    }));
    resetClientItems();
  }

  function handleClientInputChange(clientName: string) {
    applyClient(null, clientName);
  }

  function handleClientSelect(client: Client) {
    applyClient(client);
  }

  function addItem() {
    if (!form.clientId) {
      window.alert('먼저 납품처를 선택해 주세요.');
      return;
    }
    _addItem(form.orderDate, form.arriveDate);
  }

  function validateForm() {
    if (!form.orderDate) return '발주일을 입력해 주세요.';
    if (!form.arriveDate) return '입고일을 입력해 주세요.';
    if (!form.client.trim()) return '납품처를 선택해 주세요.';
    if (!form.clientId) return '납품처를 목록에서 선택해 주세요.';
    if (!form.receiver.trim()) return '수신처를 입력해 주세요.';
    if (!form.deliveryAddr.trim()) return '납품주소를 입력해 주세요.';
    if (!previewData) return '저장할 품목을 1개 이상 입력해 주세요.';
    return null;
  }

  async function handleSave() {
    if (saveLockRef.current || saving) {
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    if (!previewData) return;

    try {
      saveLockRef.current = true;
      setSaving(true);
      setError(null);

      const payload: DocumentPayload = buildDocumentPayload(
        previewData,
        getStoredUser()?.name ?? '로컬 사용자',
      );

      const documentId = await saveDocument(payload);
      navigate(`/doc-history/${documentId}`);
      window.alert('문서 저장이 완료되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 저장에 실패했습니다.');
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  function openPreview(type: Exclude<PreviewType, null>) {
    const validationMessage = validateForm();
    if (validationMessage && validationMessage !== '저장할 품목을 1개 이상 입력해 주세요.') {
      window.alert(validationMessage);
      return;
    }

    if (!previewData) {
      window.alert('미리보기 전에 품목을 먼저 입력해 주세요.');
      return;
    }

    setPreviewType(type);
  }



  async function exportToExcel() {
    const validationMessage = validateForm();
    if (validationMessage && validationMessage !== '저장할 품목을 1개 이상 입력해 주세요.') {
      window.alert(validationMessage);
      return;
    }

    if (!previewData) {
      window.alert('엑셀 다운로드 전에 품목을 먼저 입력해 주세요.');
      return;
    }

    try {
      await exportInvoiceToExcel(previewData as any);
    } catch (err) {
      console.error(err);
      window.alert('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  }

  async function openImportModal() {
    try {
      setImportLoading(true);
      setError(null);
      const rows = await fetchDocuments();
      setImportDocuments(rows);
      setImportModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러올 발행이력 목록을 가져오지 못했습니다.');
    } finally {
      setImportLoading(false);
    }
  }

  async function openSupplierModal() {
    try {
      setSupplierLoading(true);
      setError(null);
      const rows = await fetchSuppliers();
      setSuppliers(rows.filter((supplier) => supplier.active !== false));
      setSupplierModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러올 공급자 목록을 가져오지 못했습니다.');
    } finally {
      setSupplierLoading(false);
    }
  }

  function handleSelectSupplier(supplier: Supplier) {
    applySupplier(supplier);
    setSupplierModalOpen(false);
    setSupplierKeyword('');
  }

  async function handleImportDocument(document: DocumentHistory) {
    try {
      setImportLoading(true);
      setError(null);
      const productRows = document.clientId ? await fetchProductsByClientId(document.clientId) : [];
      setProducts(productRows);
      setForm((current) => ({
        ...current,
        orderDate: document.orderDate ?? today,
        arriveDate: document.arriveDate ?? '',
        clientId: document.clientId ?? '',
        client: document.client,
        manager: document.manager,
        managerTel: document.managerTel,
        receiver: document.receiver,
        deliveryAddr: document.deliveryAddr,
        remark: document.remark,
        requestNote: document.requestNote,
        supplierBizNo: document.supplierBizNo,
        supplierName: document.supplierName,
        supplierOwner: document.supplierOwner,
        supplierAddress: document.supplierAddress,
        supplierBusinessType: document.supplierBusinessType,
        supplierBusinessItem: document.supplierBusinessItem,
      }));
      prevBaseOrderDateRef.current = document.orderDate ?? today;
      prevBaseArriveDateRef.current = document.arriveDate ?? '';
      setItems(mapImportedDocumentItems(document, productRows));
      setImportModalOpen(false);
      setImportKeyword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택한 문서를 불러오지 못했습니다.');
    } finally {
      setImportLoading(false);
    }
  }

  const filteredImportDocuments = useMemo(() => {
    const keyword = importKeyword.trim().toLowerCase();
    if (!keyword) return importDocuments;

    return importDocuments.filter((document) =>
      [
        document.issueNo,
        document.client,
        document.receiver,
        document.author,
        document.items.map((item) => `${item.name1} ${item.name2}`).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [importDocuments, importKeyword]);

  const filteredSuppliers = useMemo(() => {
    const keyword = supplierKeyword.trim().toLowerCase();
    if (!keyword) return suppliers;

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
        .includes(keyword),
    );
  }, [supplierKeyword, suppliers]);



  return (
    <div className="page-content">
      <PageHeader title="문서 작성" description="" />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="doc-main-stack">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>기본 정보</h2>
            </div>
            <button className="btn btn-secondary doc-import-trigger-button" type="button" onClick={() => void openImportModal()}>
              불러오기
            </button>
          </div>

          {loading ? (
            <div className="empty-state">기본 데이터를 불러오는 중입니다...</div>
          ) : (
            <div className="doc-form-grid">
              <label className="field"><span>발주일</span><input required type="date" value={form.orderDate} onChange={(event) => updateForm('orderDate', event.target.value)} /></label>
              <label className="field"><span>입고일</span><input required type="date" value={form.arriveDate} onChange={(event) => updateForm('arriveDate', event.target.value)} /></label>
              <label className="field"><span>발급번호</span><input value={form.issueNo} onChange={(event) => updateForm('issueNo', event.target.value)} /></label>
              <label className="field">
                <span>납품처</span>
                <div className="client-search-box">
                  <input
                    className="search-input"
                    required
                    value={form.client}
                    onChange={(event) => {
                      handleClientInputChange(event.target.value);
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
                            handleClientSelect(client);
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
              <label className="field"><span>담당자</span><input value={form.manager} onChange={(event) => updateForm('manager', event.target.value)} placeholder="납품처 선택 시 자동 입력" /></label>
              <label className="field"><span>담당자 연락처</span><input value={form.managerTel} onChange={(event) => updateForm('managerTel', event.target.value)} placeholder="납품처 선택 시 자동 입력" /></label>
              <label className="field">
                <span>수신처</span>
                <div className="client-search-box">
                  <input
                    className="search-input"
                    required
                    value={form.receiver}
                    onChange={(event) => {
                      updateForm('receiver', event.target.value);
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
                            updateForm('receiver', receiver);
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
              <label className="field field-span-2-cols"><span>납품주소</span><input required value={form.deliveryAddr} onChange={(event) => updateForm('deliveryAddr', event.target.value)} /></label>
              <label className="field field-span-2"><span>유의사항</span><textarea value={form.remark} onChange={(event) => updateForm('remark', event.target.value)} /></label>
              <label className="field field-span-2"><span>요청사항</span><textarea value={form.requestNote} onChange={(event) => updateForm('requestNote', event.target.value)} /></label>
            </div>
          )}
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
              <label className="field"><span>등록번호</span><input value={form.supplierBizNo} onChange={(event) => updateForm('supplierBizNo', event.target.value)} /></label>
              <label className="field"><span>상호</span><input value={form.supplierName} onChange={(event) => updateForm('supplierName', event.target.value)} /></label>
              <label className="field"><span>성명</span><input value={form.supplierOwner} onChange={(event) => updateForm('supplierOwner', event.target.value)} /></label>
              <label className="field field-span-2"><span>사업장주소</span><textarea value={form.supplierAddress} onChange={(event) => updateForm('supplierAddress', event.target.value)} /></label>
              <label className="field"><span>업태</span><input value={form.supplierBusinessType} onChange={(event) => updateForm('supplierBusinessType', event.target.value)} /></label>
              <label className="field"><span>종목</span><input value={form.supplierBusinessItem} onChange={(event) => updateForm('supplierBusinessItem', event.target.value)} /></label>
            </div>
          ) : null}
        </section>

        <DocumentItemTable
          items={items}
          clientProducts={clientProducts}
          itemSummaries={itemSummaries}
          totals={totals}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onAddItem={addItem}
        />
      </section>

      <div className="doc-sticky-actions">
        <div className="doc-action-stack inline doc-action-stack-sticky">
          <button className="btn btn-secondary doc-sticky-action-button" onClick={() => openPreview('release')}>출고의뢰서 미리보기</button>
          <button className="btn btn-secondary doc-sticky-action-button" onClick={() => openPreview('invoice')}>거래명세서 미리보기</button>
          <button className="btn btn-secondary doc-sticky-action-button" style={{ backgroundColor: '#217346', color: 'white', borderColor: '#217346' }} onClick={exportToExcel}>엑셀 다운로드</button>
          <button className="btn btn-primary doc-sticky-action-button" disabled={saving || loading} onClick={handleSave}>{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>

      {previewType && previewData ? (
        <DocumentPreviewModal
          type={previewType}
          data={previewData}
          onClose={() => setPreviewType(null)}
        />
      ) : null}

      <Modal
        open={supplierModalOpen}
        title="공급자 불러오기"
        cardClassName="supplier-import-modal-card"
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
                <th style={{ width: 190 }}>상호</th>
                <th style={{ width: 90 }}>성명</th>
                <th>사업장주소</th>
              </tr>
            </thead>
            <tbody>
              {supplierLoading ? (
                <tr>
                  <td colSpan={3} className="table-empty">공급자 목록을 불러오는 중입니다...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="table-empty">검색 결과가 없습니다.</td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="modal-select-row"
                    onDoubleClick={() => handleSelectSupplier(supplier)}
                  >
                    <td><div className="supplier-modal-name" title={supplier.name}>{supplier.name}</div></td>
                    <td>{supplier.owner || '-'}</td>
                    <td><div className="supplier-modal-address" title={supplier.address || '-'}>{supplier.address || '-'}</div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal
        open={importModalOpen}
        title="발행이력 불러오기"
        description="기존 발행이력을 선택하면 현재 문서작성 화면에 내용이 채워집니다."
        onClose={() => {
          if (!importLoading) {
            setImportModalOpen(false);
            setImportKeyword('');
          }
        }}
        cardClassName="doc-import-modal-card"
        closeOnOverlayClick={false}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setImportModalOpen(false);
              setImportKeyword('');
            }}
            disabled={importLoading}
          >
            닫기
          </button>
        }
      >
        <div className="modal-head-actions">
          <input
            className="search-input"
            value={importKeyword}
            onChange={(event) => setImportKeyword(event.target.value)}
            placeholder="발급번호, 납품처, 수신처, 작성자로 검색"
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>발급번호</th>
                <th style={{ width: 120, textAlign: 'center' }}>발주일자</th>
                <th style={{ width: 120, textAlign: 'center' }}>입고일자</th>
                <th style={{ minWidth: 160 }}>납품처</th>
                <th style={{ minWidth: 140 }}>수신처</th>
                <th style={{ width: 90, textAlign: 'center' }}>작성자</th>
              </tr>
            </thead>
            <tbody>
              {importLoading ? (
                <tr>
                  <td colSpan={6} className="table-empty">발행이력 목록을 불러오는 중입니다...</td>
                </tr>
              ) : filteredImportDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">검색 결과가 없습니다.</td>
                </tr>
              ) : (
                filteredImportDocuments.map((document) => (
                  <tr
                    key={document.id}
                    className="modal-select-row"
                    onDoubleClick={() => void handleImportDocument(document)}
                  >
                    <td>{document.issueNo || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{document.orderDate || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{document.arriveDate || '-'}</td>
                    <td><div className="table-clamp-2" title={document.client || '-'}>{document.client || '-'}</div></td>
                    <td><div className="table-clamp-2" title={document.receiver || '-'}>{document.receiver || '-'}</div></td>
                    <td style={{ textAlign: 'center' }}>{document.author || '-'}</td>
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

function mapImportedDocumentItems(document: DocumentHistory, products: Product[]): DocItem[] {
  if (document.items.length === 0) {
    return [createEmptySharedItem(document.orderDate ?? today, document.arriveDate ?? '')];
  }

  return document.items.map((item) => {
    const matched = item.productId ? products.find((product) => product.id === item.productId) ?? null : null;
    const productId = matched ? matched.id : item.productId ? '' : item.name1 ? MANUAL_PRODUCT_ID : '';
    const manualName = item.name2 || item.name1;

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId,
      manualName: productId === MANUAL_PRODUCT_ID ? manualName : '',
      manualGubun:
        productId === MANUAL_PRODUCT_ID
          ? item.gubun || DEFAULT_GUBUN_OPTIONS[0]
          : DEFAULT_GUBUN_OPTIONS[0],
      orderDate: item.orderDate ?? document.orderDate ?? today,
      arriveDate: item.arriveDate ?? document.arriveDate ?? '',
      qty: item.qty,
      customPallet: item.customPallet,
      customBox: item.customBox,
      unitPrice: item.unitPrice,
      customSupply: item.supply,
      vat: item.vat,
      releaseNote: item.releaseNote ?? '',
      invoiceNote: item.invoiceNote ?? '',
    };
  });
}

