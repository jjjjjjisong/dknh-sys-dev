import { useEffect, useMemo, useState } from 'react';
import { fetchClients } from '../api/clients';
import { saveDocument } from '../api/documents';
import { fetchProductsByClient } from '../api/products';
import PageHeader from '../components/PageHeader';
import { getStoredUser } from '../lib/session';
import type { Client } from '../types/client';
import type { DocumentPayload } from '../types/document';
import type { Product } from '../types/product';

const MANUAL_PRODUCT_ID = '__manual__';
const DEFAULT_GUBUN_OPTIONS = ['컵', '컵뚜껑', '실링', '스트로우', '기타'];
const today = new Date().toISOString().slice(0, 10);

type PreviewType = 'release' | 'invoice' | null;

type DocItem = {
  id: string;
  productId: string;
  manualName: string;
  manualName2: string;
  manualGubun: string;
  manualEaPerB: number | null;
  manualBoxPerP: number | null;
  orderDate: string;
  arriveDate: string;
  qty: number | null;
  customPallet: number | null;
  customBox: number | null;
  unitPrice: number | null;
  customSupply: number | null;
  vat: boolean;
  itemNote: string;
};

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

type PreviewItem = {
  seq: number;
  name1: string;
  name2: string;
  gubun: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vat: boolean;
  orderDate: string | null;
  arriveDate: string | null;
  itemNote: string;
  eaPerB: number | null;
  boxPerP: number | null;
  pallet: number | null;
  box: number | null;
};

type PreviewData = {
  issueNo: string;
  client: string;
  manager: string;
  managerTel: string;
  receiver: string;
  supplierBizNo: string;
  supplierName: string;
  supplierOwner: string;
  supplierAddress: string;
  supplierBusinessType: string;
  supplierBusinessItem: string;
  orderDate: string | null;
  arriveDate: string | null;
  deliveryAddr: string;
  remark: string;
  requestNote: string;
  totalSupply: number;
  totalVat: number;
  totalAmount: number;
  items: PreviewItem[];
};

type ItemSummary = {
  name1: string;
  name2: string;
  gubun: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vatAmount: number;
  pallet: number | null;
  box: number | null;
  eaPerB: number | null;
  boxPerP: number | null;
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

function createEmptyItem(baseOrderDate = today, baseArriveDate = ''): DocItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: '',
    manualName: '',
    manualName2: '',
    manualGubun: DEFAULT_GUBUN_OPTIONS[0],
    manualEaPerB: null,
    manualBoxPerP: null,
    orderDate: baseOrderDate,
    arriveDate: baseArriveDate,
    qty: 0,
    customPallet: null,
    customBox: null,
    unitPrice: null,
    customSupply: null,
    vat: true,
    itemNote: '',
  };
}

export default function DocCreatePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<DocForm>(createInitialForm);
  const [items, setItems] = useState<DocItem[]>([createEmptyItem()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [error, setError] = useState<string | null>(null);

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
    setItems((current) =>
      current.map((item) => ({
        ...item,
        arriveDate: form.arriveDate,
      })),
    );
  }, [form.arriveDate]);

  const clientProducts = useMemo(() => products, [products]);

  const itemSummaries = useMemo<ItemSummary[]>(
    () =>
      items.map((item) => {
        const product = clientProducts.find((row) => row.id === item.productId) ?? null;
        const manualMode = item.productId === MANUAL_PRODUCT_ID;
        const name1 = manualMode ? item.manualName.trim() : product?.name1 ?? '';
        const name2 = manualMode ? item.manualName2.trim() : product?.name2 ?? '';
        const gubun = manualMode ? item.manualGubun : product?.gubun ?? '';
        const eaPerB = manualMode ? item.manualEaPerB : product?.ea_per_b ?? null;
        const boxPerP = manualMode ? item.manualBoxPerP : product?.box_per_p ?? null;
        const eaPerP = eaPerB && boxPerP ? eaPerB * boxPerP : product?.ea_per_p ?? null;
        const qty = item.qty ?? 0;
        const unitPrice = item.unitPrice ?? product?.sell_price ?? 0;
        const computedSupply = Math.round(unitPrice * qty);
        const supply = item.customSupply ?? computedSupply;
        const vatAmount = item.vat ? Math.round(supply * 0.1) : 0;

        return {
          name1,
          name2,
          gubun,
          qty,
          unitPrice,
          supply,
          vatAmount,
          pallet:
            item.customPallet !== null
              ? item.customPallet
              : eaPerP
                ? Math.ceil(qty / eaPerP)
                : null,
          box:
            item.customBox !== null
              ? item.customBox
              : eaPerB
                ? Math.ceil(qty / eaPerB)
                : null,
          eaPerB,
          boxPerP,
        };
      }),
    [clientProducts, items],
  );

  const totals = useMemo(
    () =>
      itemSummaries.reduce(
        (acc, item) => ({
          supply: acc.supply + item.supply,
          vat: acc.vat + item.vatAmount,
          total: acc.total + item.supply + item.vatAmount,
        }),
        { supply: 0, vat: 0, total: 0 },
      ),
    [itemSummaries],
  );

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
          itemNote: item.itemNote.trim(),
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

  const releasePreviewHtml = useMemo(
    () => (previewData ? buildReleasePreviewHtml(previewData) : ''),
    [previewData],
  );
  const invoicePreviewHtml = useMemo(
    () => (previewData ? buildInvoicePreviewHtml(previewData) : ''),
    [previewData],
  );

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
  }

  function addItem() {
    if (!form.client) {
      window.alert('먼저 납품처를 선택해 주세요.');
      return;
    }

    setItems((current) => [...current, createEmptyItem(form.orderDate, form.arriveDate)]);
  }

  function removeItem(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  function updateItem(id: string, updater: (item: DocItem) => DocItem) {
    setItems((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  function handleNumericFocus(
    id: string,
    key: 'qty' | 'customPallet' | 'customBox' | 'unitPrice' | 'customSupply',
  ) {
    updateItem(id, (current) => {
      const value = current[key];
      if (value === 0) {
        return { ...current, [key]: null };
      }
      return current;
    });
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
    const validationMessage = validateForm();
    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    if (!previewData) return;

    try {
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
          itemNote: item.itemNote,
          eaPerB: item.eaPerB,
          boxPerP: item.boxPerP,
          customPallet: item.pallet,
          customBox: item.box,
        })),
      };

      await saveDocument(payload);
      window.localStorage.setItem('dkh_issueno', previewData.issueNo);
      setForm(createInitialForm());
      setItems([createEmptyItem(today, '')]);
      setPreviewType(null);
      window.alert('문서 저장이 완료되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 저장에 실패했습니다.');
    } finally {
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

  function printCurrentPreview() {
    if (!previewData || !previewType) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    const html = previewType === 'release' ? releasePreviewHtml : invoicePreviewHtml;
    const styles =
      previewType === 'release' ? getReleasePreviewStyles(true) : getInvoicePreviewStyles(true);
    const title =
      previewType === 'release' ? '출고의뢰서 미리보기' : '거래명세서 미리보기';

    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      window.alert('인쇄 창을 열지 못했습니다.');
      return;
    }

    doc.open();
    doc.write(
      `<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><title>${title}</title><style>${styles}</style></head><body>${html}</body></html>`,
    );
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  }

  const previewTitle =
    previewType === 'release' ? '출고의뢰서 미리보기' : '거래명세서 미리보기';
  const previewHtml = previewType === 'release' ? releasePreviewHtml : invoicePreviewHtml;
  const previewStyles =
    previewType === 'release' ? getReleasePreviewStyles(false) : getInvoicePreviewStyles(false);

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
                <select className="search-input" required value={form.client} onChange={(event) => handleClientChange(event.target.value)}>
                  <option value="">납품처 선택</option>
                  {clients.map((client) => <option key={client.id} value={client.name}>{client.name}</option>)}
                </select>
              </label>
              <label className="field"><span>담당자</span><input value={form.manager} onChange={(event) => updateForm('manager', event.target.value)} placeholder="납품처 선택 시 자동 입력" /></label>
              <label className="field"><span>담당자 연락처</span><input value={form.managerTel} onChange={(event) => updateForm('managerTel', event.target.value)} placeholder="납품처 선택 시 자동 입력" /></label>
              <label className="field"><span>수신처</span><input required value={form.receiver} onChange={(event) => updateForm('receiver', event.target.value)} /></label>
              <label className="field field-span-2"><span>납품주소</span><textarea required value={form.deliveryAddr} onChange={(event) => updateForm('deliveryAddr', event.target.value)} /></label>
              <label className="field field-span-2"><span>비고</span><textarea value={form.remark} onChange={(event) => updateForm('remark', event.target.value)} /></label>
              <label className="field field-span-2"><span>요청사항</span><textarea value={form.requestNote} onChange={(event) => updateForm('requestNote', event.target.value)} /></label>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>공급자 정보</h2>
            </div>
          </div>
          <div className="doc-form-grid">
            <label className="field"><span>등록번호</span><input value={form.supplierBizNo} onChange={(event) => updateForm('supplierBizNo', event.target.value)} /></label>
            <label className="field"><span>상호</span><input value={form.supplierName} onChange={(event) => updateForm('supplierName', event.target.value)} /></label>
            <label className="field"><span>성명</span><input value={form.supplierOwner} onChange={(event) => updateForm('supplierOwner', event.target.value)} /></label>
            <label className="field field-span-2"><span>사업장주소</span><textarea value={form.supplierAddress} onChange={(event) => updateForm('supplierAddress', event.target.value)} /></label>
            <label className="field"><span>업태</span><input value={form.supplierBusinessType} onChange={(event) => updateForm('supplierBusinessType', event.target.value)} /></label>
            <label className="field"><span>종목</span><input value={form.supplierBusinessItem} onChange={(event) => updateForm('supplierBusinessItem', event.target.value)} /></label>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>품목 입력</h2>
            </div>
            <button className="btn btn-primary" onClick={addItem}>+ 품목 추가</button>
          </div>

          <div className="table-wrap">
            <table className="table doc-items-table wide">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="doc-item-name-cell">품목명</th>
                  <th>구분</th>
                  <th>발주일자</th>
                  <th>입고일자</th>
                  <th>수량(ea)</th>
                  <th>파렛트</th>
                  <th>BOX</th>
                  <th>단가</th>
                  <th>공급가액</th>
                  <th>VAT</th>
                  <th>비고</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const summary = itemSummaries[index];
                  const manualMode = item.productId === MANUAL_PRODUCT_ID;

                  return (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td className="doc-item-name-cell">
                        <div className="doc-inline-stack">
                          <select className="doc-cell-control" value={item.productId} onChange={(event) => {
                            const nextId = event.target.value;
                            const selected = clientProducts.find((row) => row.id === nextId);
                            updateItem(item.id, (current) => ({
                              ...current,
                              productId: nextId,
                              manualGubun: DEFAULT_GUBUN_OPTIONS[0],
                              manualName: nextId === MANUAL_PRODUCT_ID ? current.manualName : '',
                              manualName2: nextId === MANUAL_PRODUCT_ID ? current.manualName2 : '',
                              unitPrice: nextId === MANUAL_PRODUCT_ID ? current.unitPrice : selected?.sell_price ?? null,
                              customSupply: null,
                            }));
                          }}>
                            <option value="">품목 선택</option>
                            {clientProducts.map((product) => <option key={product.id} value={product.id}>{product.name1}</option>)}
                            <option value={MANUAL_PRODUCT_ID}>직접입력</option>
                          </select>
                          {manualMode ? (
                            <div className="doc-subgrid">
                              <input className="doc-cell-control doc-item-name-input" value={item.manualName} onChange={(event) => updateItem(item.id, (current) => ({ ...current, manualName: event.target.value }))} placeholder="품목명" />
                              <input className="doc-cell-control doc-item-name-input" value={item.manualName2} onChange={(event) => updateItem(item.id, (current) => ({ ...current, manualName2: event.target.value }))} placeholder="품목명(거래명세서)" />
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {manualMode ? (
                          <div className="doc-inline-stack">
                            <select className="doc-cell-control" value={item.manualGubun} onChange={(event) => updateItem(item.id, (current) => ({ ...current, manualGubun: event.target.value }))}>
                              {DEFAULT_GUBUN_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                            <div className="doc-subgrid">
                              <input className="doc-cell-control" type="number" value={item.manualEaPerB ?? ''} onChange={(event) => updateItem(item.id, (current) => ({ ...current, manualEaPerB: parseNullableInteger(event.target.value) }))} placeholder="1BOX=ea" />
                              <input className="doc-cell-control" type="number" value={item.manualBoxPerP ?? ''} onChange={(event) => updateItem(item.id, (current) => ({ ...current, manualBoxPerP: parseNullableInteger(event.target.value) }))} placeholder="1P=BOX" />
                            </div>
                          </div>
                        ) : summary.gubun || '-'}
                      </td>
                      <td><input className="doc-cell-control" type="date" value={item.orderDate} onChange={(event) => updateItem(item.id, (current) => ({ ...current, orderDate: event.target.value }))} /></td>
                      <td><input className="doc-cell-control" type="date" value={item.arriveDate} onChange={(event) => updateItem(item.id, (current) => ({ ...current, arriveDate: event.target.value }))} /></td>
                      <td><input className="doc-cell-control doc-number-input-sm" type="text" inputMode="numeric" value={formatIntegerInput(item.qty)} onFocus={() => handleNumericFocus(item.id, 'qty')} onChange={(event) => updateItem(item.id, (current) => ({ ...current, qty: parseNullableInteger(stripNonNumeric(event.target.value)), customPallet: null, customBox: null, customSupply: null }))} /></td>
                      <td><input className="doc-cell-control doc-number-input-sm" type="text" inputMode="numeric" value={formatIntegerInput(item.customPallet)} onFocus={() => handleNumericFocus(item.id, 'customPallet')} onChange={(event) => updateItem(item.id, (current) => ({ ...current, customPallet: parseNullableInteger(stripNonNumeric(event.target.value)) }))} placeholder={summary.pallet !== null ? String(summary.pallet) : '자동'} /></td>
                      <td><input className="doc-cell-control doc-number-input-sm" type="text" inputMode="numeric" value={formatIntegerInput(item.customBox)} onFocus={() => handleNumericFocus(item.id, 'customBox')} onChange={(event) => updateItem(item.id, (current) => ({ ...current, customBox: parseNullableInteger(stripNonNumeric(event.target.value)) }))} placeholder={summary.box !== null ? String(summary.box) : '자동'} /></td>
                      <td><input className="doc-cell-control doc-number-input-price" type="text" inputMode="decimal" value={formatDecimalInput(item.unitPrice)} onFocus={() => handleNumericFocus(item.id, 'unitPrice')} onChange={(event) => updateItem(item.id, (current) => ({ ...current, unitPrice: parseNullableDecimal(event.target.value), customSupply: null }))} placeholder="단가" /></td>
                      <td><input className="doc-cell-control doc-number-input-price" type="text" inputMode="numeric" value={formatIntegerInput(item.customSupply)} onFocus={() => handleNumericFocus(item.id, 'customSupply')} onChange={(event) => updateItem(item.id, (current) => ({ ...current, customSupply: parseNullableInteger(stripNonNumeric(event.target.value)) }))} placeholder={formatNumber(summary.supply)} /></td>
                      <td><label className="inline-check"><input type="checkbox" checked={item.vat} onChange={(event) => updateItem(item.id, (current) => ({ ...current, vat: event.target.checked }))} />포함</label></td>
                      <td><textarea className="doc-cell-control doc-item-note" rows={2} value={item.itemNote} onChange={(event) => updateItem(item.id, (current) => ({ ...current, itemNote: event.target.value }))} placeholder="비고" /></td>
                      <td><button className="btn btn-danger doc-delete-button" onClick={() => removeItem(item.id)}>삭제</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="doc-totals-strip">
            <div className="doc-total-item"><span>공급가액 합계</span><strong>{formatNumber(totals.supply)}</strong></div>
            <div className="doc-total-item"><span>부가세 합계</span><strong>{formatNumber(totals.vat)}</strong></div>
            <div className="doc-total-item total"><span>합계금액</span><strong>{formatNumber(totals.total)}</strong></div>
          </div>
        </section>
      </section>

      <div className="doc-sticky-actions">
        <div className="doc-action-stack inline doc-action-stack-sticky">
          <button className="btn btn-secondary doc-sticky-action-button" onClick={() => openPreview('release')}>출고의뢰서 미리보기</button>
          <button className="btn btn-secondary doc-sticky-action-button" onClick={() => openPreview('invoice')}>거래명세서 미리보기</button>
          <button className="btn btn-primary doc-sticky-action-button" disabled={saving || loading} onClick={handleSave}>{saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>

      {previewType && previewData ? (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setPreviewType(null); }}>
          <div className="modal-card preview-modal-card">
            <div className="modal-head">
              <div><h2>{previewTitle}</h2></div>
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

function buildReleasePreviewHtml(data: PreviewData) {
  const rows = data.items
    .map((item) => {
      const palletValue = item.pallet !== null ? String(item.pallet) : '-';
      const boxValue = item.box !== null ? String(item.box) : '-';

      return `<tr>
        <td class="c">${escapeHtml(String(item.seq))}</td>
        <td class="c date-col">${escapeHtml(formatShortDate(item.orderDate || data.orderDate || ''))}</td>
        <td class="c date-col">${escapeHtml(formatShortDate(item.arriveDate || data.arriveDate || data.orderDate || ''))}</td>
        <td class="l client-col">${escapeHtml(data.client)}</td>
        <td class="l name-col">${escapeHtml(item.name1)}</td>
        <td class="c pallet-col">${escapeHtml(palletValue)}</td>
        <td class="c box-col">${escapeHtml(boxValue)}</td>
        <td class="c qty-col">${escapeHtml(formatNumber(item.qty))}</td>
        <td class="l note-col">${escapeHtml(item.itemNote || '')}</td>
      </tr>`;
    })
    .join('');

  const totalPallet = data.items.reduce((sum, item) => sum + (item.pallet ?? 0), 0);
  const totalBox = data.items.reduce((sum, item) => sum + (item.box ?? 0), 0);
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);

  return `<div class="doc release-doc">
    <div class="release-approval-row">
      <div class="approval-grid">
        <div class="approval-group">
          <div class="approval-cell"><div class="approval-hd">과장</div><div class="approval-body"></div></div>
          <div class="approval-cell"><div class="approval-hd">부장</div><div class="approval-body"></div></div>
        </div>
        <div class="approval-group">
          <div class="approval-cell"><div class="approval-hd">상무</div><div class="approval-body"></div></div>
          <div class="approval-cell"><div class="approval-hd">대표</div><div class="approval-body"></div></div>
        </div>
      </div>
    </div>
    <div class="doc-title">출 고 의 뢰 서</div>
    <div class="doc-subtitle">수신: ${escapeHtml(data.receiver || '수신처 미입력')}&emsp;|&emsp;담당자 ${escapeHtml(data.manager || '-')}&emsp;|&emsp;발급 No. <strong>${escapeHtml(data.issueNo || '-')}</strong></div>
    <table class="doc-tbl">
      <thead>
        <tr>
          <th class="no-col">No</th>
          <th class="date-col">발주일</th>
          <th class="date-col">입고일</th>
          <th class="client-col">납품처</th>
          <th class="name-col">품목명</th>
          <th class="pallet-col">파렛트</th>
          <th class="box-col">BOX</th>
          <th class="qty-col">수량</th>
          <th class="note-col">비고</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="sum-row">
          <td class="c" colspan="5">합계</td>
          <td class="c">${escapeHtml(String(totalPallet))}</td>
          <td class="c">${escapeHtml(String(totalBox))}</td>
          <td class="c">${escapeHtml(formatNumber(totalQty))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <table class="doc-info-tbl">
      ${
        data.manager || data.managerTel
          ? `<tr><td class="lbl">납품처 담당자</td><td>${escapeHtml(data.manager || '')}${data.managerTel ? `&emsp;(${escapeHtml(data.managerTel)})` : ''}</td></tr>`
          : ''
      }
      ${data.deliveryAddr ? `<tr><td class="lbl">납품처 주소</td><td>${escapeHtml(data.deliveryAddr)}</td></tr>` : ''}
      ${data.remark ? `<tr><td class="lbl">비고</td><td>${escapeHtml(data.remark)}</td></tr>` : ''}
    </table>
    ${data.requestNote ? `<div class="request-box"><strong>요청사항</strong>${escapeHtml(data.requestNote).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="release-signoff">${escapeHtml(formatKoreanDate(data.orderDate || today))}<br><strong>㈜ 디케이앤에이치</strong></div>
  </div>`;
}

function buildInvoicePreviewHtml(data: PreviewData) {
  const rows = data.items
    .map((item) => {
      const vatAmount = item.vat ? Math.round(item.supply * 0.1) : 0;

      return `<tr>
        <td class="c date-col">${escapeHtml(formatMonthDay(item.arriveDate || data.arriveDate || ''))}</td>
        <td class="l product-col">${escapeHtml(item.name2 || item.name1)}</td>
        <td class="r qty-col">${escapeHtml(formatNumber(item.qty))}</td>
        <td class="r price-col">${item.unitPrice ? escapeHtml(formatNumber(item.unitPrice)) : ''}</td>
        <td class="r supply-col">${item.supply ? escapeHtml(formatNumber(item.supply)) : ''}</td>
        <td class="r vat-col">${item.vat ? escapeHtml(formatNumber(vatAmount)) : ''}</td>
        <td class="l note-col">${escapeHtml(item.itemNote || '')}</td>
      </tr>`;
    })
    .join('');

  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);
  const issueDateFmt = data.arriveDate ? formatKoreanDate(data.arriveDate) : formatKoreanDate(today);

  const invoicePiece = (suffix: string) => `<div class="invoice-doc">
    <div class="invoice-title">거 래 명 세 서 <span>${suffix}</span></div>
    <table class="invoice-head-table">
      <tr>
        <td class="buyer-cell">
          <table class="inner-table">
            <tr><td colspan="2" class="c">${escapeHtml(issueDateFmt)}</td></tr>
            <tr><td class="c strong">${escapeHtml(data.client || '')}</td><td class="c narrow">귀하</td></tr>
            <tr><td colspan="2" class="c">아래와 같이 계산합니다.</td></tr>
            <tr><td colspan="2" class="c">( 금 ${escapeHtml(formatNumber(data.totalAmount))} 원 ) VAT 포함</td></tr>
          </table>
        </td>
        <td class="seller-cell">
          <table class="inner-table">
            <tr><td rowspan="4" class="vertical">공<br>급<br>자</td><td class="c label">등록<br>번호</td><td colspan="3" class="c strong">${escapeHtml(data.supplierBizNo)}</td></tr>
            <tr><td class="c label">상호</td><td class="c strong">${escapeHtml(data.supplierName)}</td><td class="c label narrow">성명</td><td class="c">${escapeHtml(data.supplierOwner)}</td></tr>
            <tr><td class="c label">사업장<br>주소</td><td colspan="3" class="c">${escapeHtml(data.supplierAddress)}</td></tr>
            <tr><td class="c label">업태</td><td class="c">${escapeHtml(data.supplierBusinessType)}</td><td class="c label narrow">종목</td><td class="c">${escapeHtml(data.supplierBusinessItem)}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <table class="invoice-total-table">
      <tr><td class="label-cell">합계금액</td><td class="value-cell">${escapeHtml(formatNumber(data.totalAmount))} 원</td></tr>
    </table>
    <table class="invoice-items-table">
      <thead>
        <tr><th class="date-col">입고일</th><th class="product-col">품목명</th><th class="qty-col">수량</th><th class="price-col">단가</th><th class="supply-col">공급가액</th><th class="vat-col">세액</th><th class="note-col">비고</th></tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="sum-row"><td colspan="2" class="c">합계</td><td class="r">${escapeHtml(formatNumber(totalQty))}</td><td></td><td class="r">${escapeHtml(formatNumber(data.totalSupply))}</td><td class="r">${escapeHtml(formatNumber(data.totalVat))}</td><td></td></tr>
        <tr class="grand-row"><td colspan="4" class="c">총 금 액</td><td class="r">${escapeHtml(formatNumber(data.totalAmount))}</td><td class="c">인수자</td><td></td></tr>
      </tbody>
    </table>
    <div class="invoice-note-area">
      ${data.remark ? `<div><strong>참고사항 :</strong> ${escapeHtml(data.remark)}</div>` : ''}
      <div><strong>납품처 :</strong> ${escapeHtml(data.client || '')}${data.deliveryAddr ? ` / ${escapeHtml(data.deliveryAddr)}` : ''}</div>
      ${data.manager || data.managerTel ? `<div><strong>담당자 :</strong> ${escapeHtml(data.manager || '')}${data.managerTel ? ` / ${escapeHtml(data.managerTel)}` : ''}</div>` : ''}
      ${data.requestNote ? `<div><strong>요청사항 :</strong> ${escapeHtml(data.requestNote).replace(/\n/g, ' ')}</div>` : ''}
      <div class="issue-line">발급 No. ${escapeHtml(data.issueNo)}</div>
    </div>
  </div>`;

  return `<div class="invoice-page">${invoicePiece('(공급자용)')}<div class="invoice-break"></div>${invoicePiece('(공급받는자용)')}</div>`;
}

function getReleasePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.release-doc{width:${printMode ? '100%' : '1160px'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:22px 28px;box-sizing:border-box}.release-approval-row{display:flex;justify-content:flex-end;margin-bottom:6px}.approval-grid{display:flex;width:360px}.approval-group{display:flex;flex:1;border:1px solid #999}.approval-group+.approval-group{margin-left:-1px;border-left:2px solid #333}.approval-cell{flex:1;text-align:center;border-right:1px solid #999}.approval-cell:last-child{border-right:none}.approval-hd{background:#f0f0f0;font-weight:600;font-size:9.5pt;padding:4px;border-bottom:1px solid #999}.approval-body{height:34px}.doc-title{font-size:22pt;font-weight:900;letter-spacing:.2em;margin-bottom:16px;text-align:left}.doc-subtitle{font-size:12pt;margin-bottom:8px;text-align:left}.doc-tbl,.doc-info-tbl{width:100%;border-collapse:collapse;table-layout:fixed}.doc-tbl{font-size:12pt;margin-bottom:8px}.doc-tbl th,.doc-tbl td{border:1px solid #000;padding:5px 7px;vertical-align:middle}.doc-tbl th{background:#f7f7f7;font-weight:700}.doc-tbl .c{text-align:center}.doc-tbl .l{text-align:left}.doc-tbl .sum-row{background:#f0f0f0;font-weight:700}.doc-tbl .no-col{width:44px}.doc-tbl .date-col{width:82px}.doc-tbl .client-col{width:110px}.doc-tbl .name-col{width:auto}.doc-tbl .pallet-col,.doc-tbl .box-col{width:64px}.doc-tbl .qty-col{width:72px}.doc-tbl .note-col{width:130px}.doc-info-tbl{font-size:12pt;margin-bottom:6px}.doc-info-tbl td{border:1px solid #bdbdbd;padding:3px 6px}.doc-info-tbl .lbl{width:140px;background:#f7f7f7;font-weight:700}.request-box{border:1px solid #ccc;border-radius:4px;padding:6px 10px;margin-top:6px;font-size:10pt;line-height:1.5}.request-box strong{display:block;margin-bottom:2px;font-size:8.5pt}.release-signoff{text-align:right;margin-top:24px;font-size:10pt;line-height:2}.release-signoff strong{font-size:13pt;letter-spacing:.1em}@media print{@page{size:A4 landscape;margin:10mm 12mm}body{background:#fff}.release-doc{width:100%;margin:0;padding:0}}`;
}

function getInvoicePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.invoice-page{width:${printMode ? '100%' : '860px'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:${printMode ? '0' : '18px'};box-sizing:border-box}.invoice-doc{page-break-inside:avoid;break-inside:avoid}.invoice-break{border-top:1px dashed #aaa;margin:10px 0;padding-top:10px}.invoice-title{text-align:center;font-size:12pt;font-weight:900;margin-bottom:6px;letter-spacing:.1em}.invoice-title span{font-size:9pt;font-weight:400}.invoice-head-table,.invoice-total-table,.invoice-items-table,.inner-table{width:100%;border-collapse:collapse}.invoice-head-table{border:2px solid #000;margin-bottom:0}.invoice-head-table td{vertical-align:middle;padding:0}.buyer-cell{width:40%;border-right:1px solid #000}.seller-cell{width:60%}.inner-table td{border-bottom:1px solid #000;border-right:1px solid #000;padding:2px 3px;font-size:9pt;vertical-align:middle}.inner-table tr:last-child td{border-bottom:0}.inner-table td:last-child{border-right:0}.inner-table .narrow{width:28px}.inner-table .label{width:48px}.inner-table .strong{font-weight:700}.inner-table .vertical{width:20px;text-align:center;line-height:1.4;vertical-align:middle}.inner-table .c{text-align:center}.invoice-total-table{border:2px solid #000;border-top:0}.invoice-total-table td{padding:4px 8px;font-size:9pt;font-weight:700;vertical-align:middle}.invoice-total-table .label-cell{width:20%;border-right:1px solid #000}.invoice-total-table .value-cell{text-align:right}.invoice-items-table{border:2px solid #000;border-top:0;text-align:center;table-layout:fixed}.invoice-items-table th,.invoice-items-table td{border-right:1px solid #000;border-bottom:1px solid #000;padding:4px 2px;font-size:9pt;vertical-align:middle}.invoice-items-table th:last-child,.invoice-items-table td:last-child{border-right:0}.invoice-items-table tbody tr:last-child td{border-bottom:0}.invoice-items-table .l{text-align:left}.invoice-items-table .r{text-align:right}.invoice-items-table .c{text-align:center}.invoice-items-table .sum-row td,.invoice-items-table .grand-row td{font-weight:700}.invoice-items-table .date-col{width:62px}.invoice-items-table .product-col{width:auto}.invoice-items-table .qty-col{width:72px}.invoice-items-table .price-col{width:68px}.invoice-items-table .supply-col{width:92px}.invoice-items-table .vat-col{width:72px}.invoice-items-table .note-col{width:92px}.invoice-note-area{margin-top:6px;font-size:9pt;line-height:1.4;text-align:left;padding:0 3px}.invoice-note-area .issue-line{margin-top:6px;color:#666}@media print{@page{margin:6mm 8mm;size:A4 portrait}body{background:#fff}.invoice-page{width:100%;margin:0;padding:0}.invoice-break{page-break-before:avoid;break-before:avoid}}`;
}

function stripNonNumeric(value: string) {
  return value.replace(/[^\d]/g, '');
}

function parseNullableInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNullableDecimal(value: string) {
  const normalized = value.replace(/[^\d.]/g, '');
  if (!normalized.trim()) return null;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatIntegerInput(value: number | null) {
  if (value === null || value === undefined) return '';
  return value.toLocaleString('ko-KR');
}

function formatDecimalInput(value: number | null) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatShortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

function formatMonthDay(value: string) {
  if (!value) return '';
  const [, month, day] = value.split('-');
  return `${month}/${day}`;
}

function formatKoreanDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year} 년 ${parseInt(month, 10)} 월 ${parseInt(day, 10)} 일`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
