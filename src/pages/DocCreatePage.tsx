import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClients } from '../api/clients';
import { saveDocument } from '../api/documents';
import { fetchProductsByClient } from '../api/products';
import PageHeader from '../components/PageHeader';
import { getStoredUser } from '../lib/session';
import { exportInvoiceToExcel } from '../utils/excelExport';
import DocumentPreviewModal, { PreviewType } from '../components/ui/DocumentPreviewModal';
import DocumentItemTable, { MANUAL_PRODUCT_ID, DEFAULT_GUBUN_OPTIONS } from '../components/ui/DocumentItemTable';
import type { SharedItemRow as DocItem, ItemSummary } from '../components/ui/DocumentItemTable';
import { useDocumentItems, createEmptySharedItem } from '../hooks/useDocumentItems';
import type { Client } from '../types/client';
import type { DocumentPayload } from '../types/document';
import type { Product } from '../types/product';
import type { SharedPreviewData as PreviewData, SharedPreviewItem as PreviewItem } from '../types/documentPreview';
import { emptyToNull, formatIntegerInput, parseNullableInteger, stripNonNumeric, formatNumber } from '../utils/formatters';

const today = new Date().toISOString().slice(0, 10);

type DocForm = {
  issueNo: string;
  orderDate: string;
  arriveDate: string;
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
  const nextIssueNo = String(
    (parseInt(window.localStorage.getItem('dkh_issueno') || '26000', 10) || 26000) + 1,
  );

  return {
    issueNo: nextIssueNo,
    orderDate: today,
    arriveDate: '',
    client: '',
    manager: '',
    managerTel: '',
    receiver: '',
    deliveryAddr: '',
    remark: '',
    requestNote: '',
    supplierBizNo: '113 - 88 - 02729',
    supplierName: '디케이앤에이치',
    supplierOwner: '김 주 영',
    supplierAddress: '서울 동대문구 천호대로 21, 5층 507호',
    supplierBusinessType: '도매 및 소매업',
    supplierBusinessItem: '식품용기류(플라스틱용기)',
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

export default function DocCreatePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
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
  const saveLockRef = useRef(false);
  const prevBaseOrderDateRef = useRef(form.orderDate);
  const prevBaseArriveDateRef = useRef(form.arriveDate);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchClients();
        if (!mounted) return;
        setClients(rows.filter((client) => client.active !== false));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '기본정보를 불러오지 못했습니다.');
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
      if (!form.client) {
        setProducts([]);
        return;
      }

      try {
        const rows = await fetchProductsByClient(form.client);
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
  }, [form.client]);

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

  const previewData = useMemo<PreviewData | null>(() => {
    const validItems: PreviewItem[] = itemSummaries
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
      .filter((item): item is PreviewItem => item !== null);

    if (validItems.length === 0) return null;

    return {
      issueNo: form.issueNo.trim(),
      client: form.client.trim(),
      manager: form.manager.trim(),
      managerTel: form.managerTel.trim(),
      receiver: form.receiver.trim(),
      supplierBizNo: form.supplierBizNo.trim(),
      supplierName: form.supplierName.trim(),
      supplierOwner: form.supplierOwner.trim(),
      supplierAddress: form.supplierAddress.trim(),
      supplierBusinessType: form.supplierBusinessType.trim(),
      supplierBusinessItem: form.supplierBusinessItem.trim(),
      orderDate: emptyToNull(form.orderDate),
      arriveDate: emptyToNull(form.arriveDate),
      deliveryAddr: form.deliveryAddr.trim(),
      remark: form.remark.trim(),
      requestNote: form.requestNote.trim(),
      totalSupply: totals.supply,
      totalVat: totals.vat,
      totalAmount: totals.total,
      items: validItems,
    };
  }, [form, itemSummaries, items, totals]);



  function updateForm<K extends keyof DocForm>(key: K, value: DocForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleClientChange(clientName: string) {
    const client = clients.find((row) => row.name === clientName) ?? null;
    setForm((current) => ({
      ...current,
      client: clientName,
      manager: client?.manager ?? '',
      managerTel: client?.tel ?? '',
      deliveryAddr: client?.addr ?? '',
      remark:
        client && (client.time || client.lunch)
          ? `입고시간 : ${client.time || '-'} / 점심 ${client.lunch || '-'}`
          : '',
    }));

    setItems((current) =>
      current.map((item) =>
        item.productId && item.productId !== MANUAL_PRODUCT_ID
          ? { ...item, productId: '', unitPrice: null, customSupply: null }
          : item,
      ),
    );

    setForm((current) => ({
      ...current,
      remark: buildClientRemark(client),
    }));
  }

  function addItem() {
    if (!form.client) {
      window.alert('먼저 납품처를 선택해 주세요.');
      return;
    }
    _addItem(form.orderDate, form.arriveDate);
  }

  function validateForm() {
    if (!form.orderDate) return '발주일을 입력해 주세요.';
    if (!form.arriveDate) return '입고일을 입력해 주세요.';
    if (!form.client.trim()) return '납품처를 선택해 주세요.';
    if (!form.receiver.trim()) return '수신처를 입력해 주세요.';
    if (!form.deliveryAddr.trim()) return '납품주소를 입력해 주세요.';
    if (!previewData) return '저장할 품목을 한 줄 이상 입력해 주세요.';
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

      const payload: DocumentPayload = {
        issueNo: previewData.issueNo,
        client: previewData.client,
        manager: previewData.manager,
        managerTel: previewData.managerTel,
        receiver: previewData.receiver,
        supplierBizNo: previewData.supplierBizNo,
        supplierName: previewData.supplierName,
        supplierOwner: previewData.supplierOwner,
        supplierAddress: previewData.supplierAddress,
        supplierBusinessType: previewData.supplierBusinessType,
        supplierBusinessItem: previewData.supplierBusinessItem,
        orderDate: previewData.orderDate,
        arriveDate: previewData.arriveDate,
        deliveryAddr: previewData.deliveryAddr,
        remark: previewData.remark,
        requestNote: previewData.requestNote,
        totalSupply: previewData.totalSupply,
        totalVat: previewData.totalVat,
        totalAmount: previewData.totalAmount,
        author: getStoredUser()?.name ?? '로컬 사용자',
        status: 'ST00',
        items: previewData.items.map((item) => ({
          seq: item.seq,
          name1: item.name1,
          name2: item.name2,
          gubun: item.gubun,
          qty: item.qty,
          unitPrice: item.unitPrice,
          supply: item.supply,
          vat: item.vat,
          orderDate: item.orderDate,
          arriveDate: item.arriveDate,
          releaseNote: item.releaseNote,
          invoiceNote: item.invoiceNote,
          eaPerB: item.eaPerB,
          boxPerP: item.boxPerP,
          customPallet: item.pallet,
          customBox: item.box,
        })),
      };

      const documentId = await saveDocument(payload);
      window.localStorage.setItem('dkh_issueno', previewData.issueNo);
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
    if (validationMessage && validationMessage !== '저장할 품목을 한 줄 이상 입력해 주세요.') {
      window.alert(validationMessage);
      return;
    }

    if (!previewData) {
      window.alert('미리보기할 품목을 먼저 입력해 주세요.');
      return;
    }

    setPreviewType(type);
  }



  async function exportToExcel() {
    const validationMessage = validateForm();
    if (validationMessage && validationMessage !== '저장할 품목을 한 줄 이상 입력해 주세요.') {
      window.alert(validationMessage);
      return;
    }

    if (!previewData) {
      window.alert('엑셀로 내보낼 품목을 먼저 입력해 주세요.');
      return;
    }

    try {
      await exportInvoiceToExcel(previewData as any);
    } catch (err) {
      console.error(err);
      window.alert('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
  }



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
                      handleClientChange(event.target.value);
                      setClientDropdownOpen(true);
                    }}
                    onFocus={() => setClientDropdownOpen(true)}
                    onBlur={() => window.setTimeout(() => setClientDropdownOpen(false), 120)}
                    placeholder="납품처 검색 또는 선택"
                  />
                  <span className="client-search-caret" aria-hidden="true">
                    ▾
                  </span>
                  {clientDropdownOpen && filteredClients.length > 0 ? (
                    <div className="client-search-dropdown">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="client-search-option"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleClientChange(client.name);
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
              <label className="field"><span>수신처</span><input required value={form.receiver} onChange={(event) => updateForm('receiver', event.target.value)} /></label>
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
    </div>
  );
}
